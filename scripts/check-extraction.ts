// Runs the structuring call against every real client's already-cached CrawledPage rows —
// no re-crawl, no Playwright, just the Claude call — and prints every array field, not just
// whichever one the current change happens to touch. Exists because the 11/16 -> 4/16
// services report earlier in this pipeline's development was true and incomplete: it only
// counted services, so testimonials/stats/faqs/differentiators/process silently collapsing
// to zero on the same client went unnoticed for two full report cycles. Any change to
// select-relevant-pages.ts or structure-and-rewrite.ts should be checked against this before
// being called done — that's the whole point of keeping it as a real script instead of a
// scratch-*.ts thrown away after one use.
//
// Local dev: npx tsx --env-file=.env scripts/check-extraction.ts (or npm run check-extraction)
// Run from the repo root — scripts/baselines/ below is resolved relative to process.cwd().
//
// Requires CrawledPage rows to already exist for a client (i.e. it's been analysed at least
// once) — a client with none is reported and skipped, not treated as a failure.
//
// --client <id> [--baseline]
//   Scope to one client instead of looping over every non-deleted one.
//   --client <id> alone: run and print that one client's summary, no file I/O.
//   --client <id> --baseline: first run (no saved baseline yet) writes
//   scripts/baselines/<clientId>.json and exits 0. A later run with the same flags reads
//   that file back and diffs the fresh result against it, exiting non-zero on any
//   mismatch. The baseline is the coarse summary this script already computes (array-field
//   counts, ctaLabel, page counts) — not the full free-text extraction, which is
//   AI-generated prose and would essentially never match byte-for-byte between two live
//   calls even when nothing regressed. Delete the file under scripts/baselines/ to reset it.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { selectRelevantPages } from "@/lib/content/select-relevant-pages";
import { structureAndRewriteContent } from "@/lib/content/structure-and-rewrite";

const ARRAY_FIELDS = [
  "services",
  "testimonials",
  "stats",
  "faqs",
  "differentiators",
  "process",
  "serviceAreas",
  "hours",
  "offers",
  "credentials",
] as const;

const BASELINES_DIR = join(process.cwd(), "scripts", "baselines");

function baselinePath(clientId: string): string {
  return join(BASELINES_DIR, `${clientId}.json`);
}

type Snapshot = {
  clientId: string;
  pagesCrawled: number;
  pagesSelected: number;
  selectedChars: number;
  counts: Record<(typeof ARRAY_FIELDS)[number], number>;
  inferredServices: number;
  ctaLabel: string | null;
};

// Returns null (and has already printed why) rather than throwing, so a skip/failure for
// one client in --client mode still exits cleanly instead of looking like a crash.
async function checkClient(client: { id: string; name: string }): Promise<Snapshot | null> {
  // Explicit order — Postgres does not guarantee row order without one, and every
  // downstream sort that consumes this array (select-relevant-pages.ts, select-hero-
  // image.ts, extract-colors.ts, download-images.ts) uses stable-sort-preserves-input-
  // order as part of its tiebreak. createdAt matches actual crawl order; id is a pure,
  // stable tiebreak for the same-millisecond case, never meant to carry meaning alone.
  const pages = await prisma.crawledPage.findMany({
    where: { clientId: client.id },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  if (pages.length === 0) {
    console.log(`\n${client.name}: no cached CrawledPage rows — never analysed, skipped`);
    return null;
  }

  const pageExtractions = pages.map((p) => ({
    url: p.url,
    title: p.title ?? "",
    text: p.textContent ?? "",
    links: [] as string[],
  }));
  const selected = selectRelevantPages(pageExtractions as never);
  const selectedChars = selected.reduce((sum, p) => sum + p.text.length, 0);

  try {
    const structured = await structureAndRewriteContent(
      selected.map((p) => ({ url: p.url, title: p.title, text: p.text })),
      []
    );

    const counts = ARRAY_FIELDS.map((f) => structured[f].length);
    const inferredServices = structured.services.filter((s) =>
      (s.flagReason ?? "").toLowerCase().includes("infer")
    ).length;
    const nonServiceCounts = counts.slice(1); // everything after services
    const emptyNonService = nonServiceCounts.filter((c) => c === 0).length;

    console.log(
      `\n${client.name}: ${pages.length} crawled -> ${selected.length} selected (${selectedChars} chars)`
    );
    console.log(
      `  ` +
        ARRAY_FIELDS.map((f, i) => `${f}=${counts[i]}`).join(" ")
    );
    console.log(`  services inferred: ${inferredServices}/${structured.services.length}`);
    console.log(`  ctaLabel: ${structured.ctaLabel ?? "(none)"}`);
    if (emptyNonService >= 8) {
      console.log(`  *** ${emptyNonService}/9 non-service arrays empty — possible collapse ***`);
    }

    const countsRecord = Object.fromEntries(ARRAY_FIELDS.map((f, i) => [f, counts[i]])) as Snapshot["counts"];

    return {
      clientId: client.id,
      pagesCrawled: pages.length,
      pagesSelected: selected.length,
      selectedChars,
      counts: countsRecord,
      inferredServices,
      ctaLabel: structured.ctaLabel ?? null,
    };
  } catch (err) {
    console.log(`\n${client.name}: FAILED — ${(err as Error).message}`);
    return null;
  }
}

// Flat key/value pairs so a mismatch report can name the exact field that moved, rather
// than just say "objects differ".
function flatten(snapshot: Snapshot): Record<string, string | number | null> {
  const flat: Record<string, string | number | null> = {
    pagesCrawled: snapshot.pagesCrawled,
    pagesSelected: snapshot.pagesSelected,
    selectedChars: snapshot.selectedChars,
    inferredServices: snapshot.inferredServices,
    ctaLabel: snapshot.ctaLabel,
  };
  for (const f of ARRAY_FIELDS) flat[`counts.${f}`] = snapshot.counts[f];
  return flat;
}

// Exit code is main()'s call, not this function's — returns whether anything mismatched so
// the summary line prints before the process decides how to exit.
function diffAgainstBaseline(clientName: string, baseline: Snapshot, fresh: Snapshot): boolean {
  const baseFlat = flatten(baseline);
  const freshFlat = flatten(fresh);
  let anyDiff = false;

  console.log(`\n${clientName}: diffing against saved baseline (${baselinePath(fresh.clientId)})`);
  for (const key of Object.keys(baseFlat)) {
    if (baseFlat[key] !== freshFlat[key]) {
      anyDiff = true;
      console.log(
        `  MISMATCH ${key}: baseline=${JSON.stringify(baseFlat[key])} current=${JSON.stringify(freshFlat[key])}`
      );
    }
  }

  console.log(anyDiff ? "  DIFF DETECTED against baseline" : "  No diff — matches baseline");
  return anyDiff;
}

function parseArgs(argv: string[]): { clientId: string | null; baseline: boolean } {
  let clientId: string | null = null;
  let baseline = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--client") {
      clientId = argv[i + 1] ?? null;
      i++;
    } else if (argv[i] === "--baseline") {
      baseline = true;
    }
  }
  return { clientId, baseline };
}

async function runSingleClient(clientId: string, baseline: boolean): Promise<void> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    console.error(`FATAL: no client with id ${clientId}`);
    process.exitCode = 1;
    return;
  }

  const snapshot = await checkClient(client);
  if (!snapshot) {
    // checkClient already printed why (no cached pages, or the structuring call failed).
    process.exitCode = 1;
    return;
  }

  if (!baseline) return;

  const path = baselinePath(clientId);
  if (!existsSync(path)) {
    mkdirSync(BASELINES_DIR, { recursive: true });
    writeFileSync(path, JSON.stringify(snapshot, null, 2) + "\n");
    console.log(`\nBaseline written: ${path}`);
    return;
  }

  const savedBaseline = JSON.parse(readFileSync(path, "utf8")) as Snapshot;
  const hasDiff = diffAgainstBaseline(client.name, savedBaseline, snapshot);
  if (hasDiff) process.exitCode = 1;
}

async function main() {
  const { clientId, baseline } = parseArgs(process.argv.slice(2));

  if (baseline && !clientId) {
    console.error("FATAL: --baseline requires --client <id>");
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  if (clientId) {
    await runSingleClient(clientId, baseline);
    await prisma.$disconnect();
    return;
  }

  const clients = await prisma.client.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  console.log(`Checking ${clients.length} clients...`);
  for (const client of clients) {
    await checkClient(client);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
