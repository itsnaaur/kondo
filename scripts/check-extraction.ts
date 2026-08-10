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
//
// Requires CrawledPage rows to already exist for a client (i.e. it's been analysed at least
// once) — a client with none is reported and skipped, not treated as a failure.
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

async function checkClient(client: { id: string; name: string }) {
  const pages = await prisma.crawledPage.findMany({ where: { clientId: client.id } });
  if (pages.length === 0) {
    console.log(`\n${client.name}: no cached CrawledPage rows — never analysed, skipped`);
    return;
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
  } catch (err) {
    console.log(`\n${client.name}: FAILED — ${(err as Error).message}`);
  }
}

async function main() {
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
