// Two small, deliberately narrow helpers for verification/throwaway scripts that call
// crawlClientSite / downloadCrawlImages directly, outside lib/content/run-analysis.ts's own
// real single-call-per-analysis lifecycle. Both exist because the same accumulation pattern
// hit two different tables for two different reasons (docs/kondo-v2-execution.md's 1.7c
// entry has the full story) — only one of those reasons is safe to fix with a blind delete,
// which is why there are two helpers here, not one generic "clean up before you crawl"
// function.

import { prisma } from "@/lib/prisma";
import { crawlClientSite } from "@/lib/crawl/crawler";
import type { PageExtraction } from "@/lib/crawl/types";

// CrawledPage rows are genuinely ephemeral — nothing references them once an analysis
// completes (see that model's own schema comment) — so deleting unconditionally before a
// re-crawl is always safe. This is exactly what lib/content/run-analysis.ts itself does
// before calling crawlClientSite for real. Use this instead of calling crawlClientSite
// directly in a verification script, or the next ad hoc test run accumulates the same stale
// rows Task 1.2 found and fixed.
export async function deleteThenCrawl(
  clientId: string,
  siteUrl: string
): Promise<{ pages: PageExtraction[]; truncated: boolean }> {
  await prisma.crawledPage.deleteMany({ where: { clientId } });
  return crawlClientSite(clientId, siteUrl);
}

// Asset rows are NOT safe to delete unconditionally, unlike CrawledPage — they're
// deliberately append-only in production (a published Concept's HTML has Asset URLs baked
// in permanently — see the Asset model's own schema comment), and ContentImage stores only
// an assetId, no URL of its own, so a live ContentRecord's logoAssetId/images still depend
// on the referenced rows existing even before anything is published. Task 1.7b found this
// the hard way: Princeton Dental had a PUBLISHED Concept depending on exactly this, one
// query away from being broken by a wholesale cleanup. This helper deletes only what a
// client's *current* ContentRecord does not reference — the genuine stale/orphaned rows a
// repeated ad hoc test script accumulates — never the live set.
export async function deleteUnreferencedTestAssets(
  clientId: string
): Promise<{ preserved: number; deleted: number }> {
  const record = await prisma.contentRecord.findUnique({
    where: { clientId },
    select: { logoAssetId: true, images: true },
  });
  const referenced = new Set<string>();
  if (record?.logoAssetId) referenced.add(record.logoAssetId);
  for (const img of (record?.images as { assetId: string }[] | null) ?? []) referenced.add(img.assetId);

  const { count } = await prisma.asset.deleteMany({
    where: { clientId, id: { notIn: [...referenced] } },
  });
  return { preserved: referenced.size, deleted: count };
}
