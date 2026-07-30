import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { crawlClientSite } from "@/lib/crawl/crawler";
import { downloadCrawlImages } from "@/lib/crawl/download-images";
import { extractDominantColors, DEFAULT_NEUTRAL_PALETTE } from "./extract-colors";
import { flagLowQualityImages } from "./assess-image-quality";
import { selectHeroAssetId } from "./select-hero-image";
import { extractContactDetails } from "./contact-extraction";
import { structureAndRewriteContent } from "./structure-and-rewrite";
import { selectRelevantPages } from "./select-relevant-pages";
import type { ConfidenceLevel, ContentImage, FieldFlag, FieldFlags } from "./types";
import type { Prisma } from "@/app/generated/prisma/client";

function flagFor(confidence: ConfidenceLevel, reason: string): FieldFlag | undefined {
  return confidence === "high" ? undefined : { confidence, reason };
}

// The one Analyse Site job: crawl (Playwright, via the worker — this is the slow, once-run
// step), deterministic logo/color/contact extraction, exactly one Claude call to structure
// and rewrite the copy, then a single upsert. Called by scripts/worker.ts for the
// ANALYZE_SITE job type, for both a first analysis and a Re-analyse Site.
//
// On success: ContentRecord is written (or overwritten in place — same id — via upsert)
// with reviewedAt/reviewedByUserId explicitly reset to null, and status flips to
// READY_FOR_REVIEW. On failure: status flips to ANALYSIS_FAILED and the existing
// ContentRecord (if any), including its reviewedAt, is left completely untouched — a
// failed re-analysis never locks a client out of its own already-approved content, because
// nothing downstream of Choose Template gates on Client.status (see the Kondo rebuild
// plan's ClientStatus/gating notes).
export async function runAnalysisInBackground(clientId: string, siteUrl: string): Promise<void> {
  try {
    // Deleted at the start of every run, not just left to accumulate — CrawledPage is not
    // append-only like Asset, and shouldn't be: an Asset can be baked into an already-
    // published Concept's frozen HTML forever, but nothing references a CrawledPage row
    // once extraction for that run completes. Confirmed live: a handful of re-analyses of
    // the same 92-page site left 927 stale rows behind with no functional purpose.
    await prisma.crawledPage.deleteMany({ where: { clientId } });

    const { pages, truncated } = await crawlClientSite(clientId, siteUrl);

    // Which pages actually inform the AI call — homepage always, then whichever crawled
    // pages look like About/Services/Contact/Testimonials, up to a character budget. This
    // is what pagesAnalyzed reports below: crawlPagesCount (all of `pages`) routinely
    // overstates what the extraction actually saw on anything past a handful of pages.
    const selectedPages = selectRelevantPages(pages);

    const { logo, candidates } = await downloadCrawlImages(clientId, pages, selectedPages);

    // Flag first (deterministic, dimension-only), pick the hero candidate from the
    // flagged results second — selectHeroAssetId needs the widthPx/heightPx this computes,
    // and reuses them rather than decoding each image a second time.
    const imageInputs = [
      ...(logo ? [{ assetId: logo.asset.id, role: "logo" as const, buffer: logo.buffer }] : []),
      ...candidates.map((c) => ({ assetId: c.asset.id, role: "gallery" as ContentImage["role"], buffer: c.buffer })),
    ];
    const flaggedImages = await flagLowQualityImages(imageInputs);

    const fromHomepageByAssetId = new Map(candidates.map((c) => [c.asset.id, c.fromHomepage]));
    const heroAssetId = selectHeroAssetId(
      flaggedImages
        .filter((img) => img.role === "gallery")
        .map((img) => ({ image: img, fromHomepage: fromHomepageByAssetId.get(img.assetId) ?? false }))
    );
    const contentImages: ContentImage[] = flaggedImages.map((img) =>
      img.assetId === heroAssetId ? { ...img, role: "hero" } : img
    );

    const colorSourceBuffer =
      logo?.buffer ?? candidates.find((c) => c.asset.id === heroAssetId)?.buffer ?? candidates[0]?.buffer ?? null;
    const brandColors = colorSourceBuffer
      ? await extractDominantColors(colorSourceBuffer)
      : DEFAULT_NEUTRAL_PALETTE;

    // Contact extraction is cheap regex/link-scanning, not AI-token-bound, so it scans
    // every crawled page rather than just the ones selected for the AI call — more
    // chances to find a real mailto:/tel: link or an address mention.
    const allLinks = pages.flatMap((p) => p.links);
    const combinedText = pages.map((p) => p.text).join("\n");
    const contact = extractContactDetails(allLinks, combinedText, siteUrl);

    const structured = await structureAndRewriteContent(
      selectedPages.map((p) => ({ url: p.url, title: p.title, text: p.text }))
    );

    const fieldFlags: FieldFlags = {};
    const businessNameFlag = flagFor(structured.businessNameConfidence, "AI-extracted from crawled site text");
    const taglineFlag = flagFor(structured.taglineConfidence, "AI-rewritten from crawled site text");
    const aboutCopyFlag = flagFor(structured.aboutCopyConfidence, "AI-rewritten from crawled site text");
    const contactAddressFlag = flagFor(structured.contactAddressConfidence, "AI-extracted from crawled site text");
    if (businessNameFlag) fieldFlags.businessName = businessNameFlag;
    if (taglineFlag) fieldFlags.tagline = taglineFlag;
    if (aboutCopyFlag) fieldFlags.aboutCopy = aboutCopyFlag;
    if (contactAddressFlag) fieldFlags.contactAddress = contactAddressFlag;
    if (contact.emailFlag) fieldFlags.contactEmail = contact.emailFlag;
    if (contact.phoneFlag) fieldFlags.contactPhone = contact.phoneFlag;

    const services = structured.services.map((s) => ({ ...s, id: randomUUID() }));
    const testimonials = structured.testimonials.map((t) => ({ ...t, id: randomUUID() }));

    await prisma.contentRecord.upsert({
      where: { clientId },
      create: {
        clientId,
        businessName: structured.businessName,
        tagline: structured.tagline,
        aboutCopy: structured.aboutCopy,
        services: services as unknown as Prisma.InputJsonValue,
        testimonials: testimonials as unknown as Prisma.InputJsonValue,
        brandColors: brandColors as unknown as Prisma.InputJsonValue,
        images: contentImages as unknown as Prisma.InputJsonValue,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        contactAddress: structured.contactAddress,
        logoAssetId: logo?.asset.id ?? null,
        detectedIndustry: structured.detectedIndustry,
        fieldFlags: fieldFlags as unknown as Prisma.InputJsonValue,
        crawlPagesCount: pages.length,
        pagesAnalyzed: selectedPages.length,
        sourceCrawlTruncated: truncated,
        reviewedAt: null,
        reviewedByUserId: null,
      },
      update: {
        businessName: structured.businessName,
        tagline: structured.tagline,
        aboutCopy: structured.aboutCopy,
        services: services as unknown as Prisma.InputJsonValue,
        testimonials: testimonials as unknown as Prisma.InputJsonValue,
        brandColors: brandColors as unknown as Prisma.InputJsonValue,
        images: contentImages as unknown as Prisma.InputJsonValue,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        contactAddress: structured.contactAddress,
        logoAssetId: logo?.asset.id ?? null,
        detectedIndustry: structured.detectedIndustry,
        fieldFlags: fieldFlags as unknown as Prisma.InputJsonValue,
        crawlPagesCount: pages.length,
        pagesAnalyzed: selectedPages.length,
        sourceCrawlTruncated: truncated,
        // Explicitly reset on every re-analysis — this is what re-locks Choose Template /
        // Generate & Preview until a human re-approves the fresh extraction. See the plan's
        // gating fix: Client.status is never the gate, contentRecord.reviewedAt is.
        reviewedAt: null,
        reviewedByUserId: null,
      },
    });

    await prisma.client.update({ where: { id: clientId }, data: { status: "READY_FOR_REVIEW" } });
  } catch (err) {
    await prisma.client
      .update({ where: { id: clientId }, data: { status: "ANALYSIS_FAILED" } })
      .catch(() => {
        // Client may have been deleted between enqueue and this failure — nothing to update.
      });
    throw err;
  }
}
