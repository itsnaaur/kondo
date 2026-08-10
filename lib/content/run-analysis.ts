import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { crawlClientSite } from "@/lib/crawl/crawler";
import { downloadCrawlImages } from "@/lib/crawl/download-images";
import { extractDominantColors, DEFAULT_NEUTRAL_PALETTE } from "./extract-colors";
import { flagLowQualityImages } from "./assess-image-quality";
import { classifyPartnerLogos } from "./classify-partner-logos";
import { selectHeroAssetId } from "./select-hero-image";
import { extractContactDetails } from "./contact-extraction";
import { structureAndRewriteContent } from "./structure-and-rewrite";
import { selectRelevantPages } from "./select-relevant-pages";
import { isJunkBySize } from "./filter-junk-images";
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
    const flaggedImagesRaw = await flagLowQualityImages(imageInputs);

    // Deterministic junk filter, size-based half — the URL/alt-text half already ran at
    // download time (lib/crawl/download-images.ts), before any upload. This half catches
    // whatever slipped past that (a tiny icon with an innocuous filename/alt) now that real
    // dimensions are known. Never applied to the logo — a small square logo is normal.
    const flaggedImages = flaggedImagesRaw.filter(
      (img) => img.role !== "gallery" || !isJunkBySize(img.widthPx, img.heightPx)
    );

    const fromHomepageByAssetId = new Map(candidates.map((c) => [c.asset.id, c.fromHomepage]));
    const heroAssetId = selectHeroAssetId(
      flaggedImages
        .filter((img) => img.role === "gallery")
        .map((img) => ({ image: img, fromHomepage: fromHomepageByAssetId.get(img.assetId) ?? false }))
    );
    const heroAssigned: ContentImage[] = flaggedImages.map((img) =>
      img.assetId === heroAssetId ? { ...img, role: "hero" } : img
    );
    const nearbyTextByAssetId = new Map(candidates.map((c) => [c.asset.id, c.nearbyText]));
    const contentImages = classifyPartnerLogos(heroAssigned, nearbyTextByAssetId);

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

    // Only gallery/hero images get offered for AI captioning — partner logos are trust-
    // strip marks, not content photos, and classifyPartnerLogos has already pulled them
    // out of this pool above.
    const imageCandidatesForAi = contentImages
      .filter((img) => img.role === "gallery" || img.role === "hero")
      .map((img) => ({ assetId: img.assetId, nearbyText: nearbyTextByAssetId.get(img.assetId) ?? "" }));

    const structured = await structureAndRewriteContent(
      selectedPages.map((p) => ({ url: p.url, title: p.title, text: p.text })),
      imageCandidatesForAi
    );

    const imageClassificationByAssetId = new Map(structured.images.map((i) => [i.assetId, i]));
    const contentImagesWithCaptions: ContentImage[] = contentImages.map((img) => {
      const classification = imageClassificationByAssetId.get(img.assetId);
      if (!classification) return img;
      return {
        ...img,
        caption: classification.caption ?? undefined,
        subject: classification.subject,
        suitableAsHero: classification.suitableAsHero,
        subjectConfidence: classification.confidence,
      };
    });

    const fieldFlags: FieldFlags = {};
    const businessNameFlag = flagFor(structured.businessNameConfidence, "AI-extracted from crawled site text");
    const taglineFlag = flagFor(structured.taglineConfidence, "AI-rewritten from crawled site text");
    const aboutCopyFlag = flagFor(structured.aboutCopyConfidence, "AI-rewritten from crawled site text");
    const contactAddressFlag = flagFor(structured.contactAddressConfidence, "AI-extracted from crawled site text");
    const ctaLabelFlag = flagFor(structured.ctaLabelConfidence, "AI-extracted from crawled site text");
    if (businessNameFlag) fieldFlags.businessName = businessNameFlag;
    if (taglineFlag) fieldFlags.tagline = taglineFlag;
    if (aboutCopyFlag) fieldFlags.aboutCopy = aboutCopyFlag;
    if (contactAddressFlag) fieldFlags.contactAddress = contactAddressFlag;
    if (ctaLabelFlag) fieldFlags.ctaLabel = ctaLabelFlag;
    if (contact.emailFlag) fieldFlags.contactEmail = contact.emailFlag;
    if (contact.phoneFlag) fieldFlags.contactPhone = contact.phoneFlag;

    const services = structured.services.map((s) => ({ ...s, id: randomUUID() }));
    const testimonials = structured.testimonials.map((t) => ({ ...t, id: randomUUID() }));
    const stats = structured.stats.map((s) => ({ ...s, id: randomUUID() }));
    const faqs = structured.faqs.map((f) => ({ ...f, id: randomUUID() }));
    const differentiators = structured.differentiators.map((d) => ({ ...d, id: randomUUID() }));
    const process = structured.process.map((p) => ({ ...p, id: randomUUID() }));
    const serviceAreas = structured.serviceAreas.map((s) => ({ ...s, id: randomUUID() }));
    const hours = structured.hours.map((h) => ({ ...h, id: randomUUID() }));
    const offers = structured.offers.map((o) => ({ ...o, id: randomUUID() }));
    const credentials = structured.credentials.map((c) => ({ ...c, id: randomUUID() }));

    await prisma.contentRecord.upsert({
      where: { clientId },
      create: {
        clientId,
        businessName: structured.businessName,
        tagline: structured.tagline,
        aboutCopy: structured.aboutCopy,
        ctaLabel: structured.ctaLabel,
        services: services as unknown as Prisma.InputJsonValue,
        testimonials: testimonials as unknown as Prisma.InputJsonValue,
        stats: stats as unknown as Prisma.InputJsonValue,
        faqs: faqs as unknown as Prisma.InputJsonValue,
        differentiators: differentiators as unknown as Prisma.InputJsonValue,
        process: process as unknown as Prisma.InputJsonValue,
        serviceAreas: serviceAreas as unknown as Prisma.InputJsonValue,
        hours: hours as unknown as Prisma.InputJsonValue,
        offers: offers as unknown as Prisma.InputJsonValue,
        credentials: credentials as unknown as Prisma.InputJsonValue,
        brandColors: brandColors as unknown as Prisma.InputJsonValue,
        images: contentImagesWithCaptions as unknown as Prisma.InputJsonValue,
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
        ctaLabel: structured.ctaLabel,
        services: services as unknown as Prisma.InputJsonValue,
        testimonials: testimonials as unknown as Prisma.InputJsonValue,
        stats: stats as unknown as Prisma.InputJsonValue,
        faqs: faqs as unknown as Prisma.InputJsonValue,
        differentiators: differentiators as unknown as Prisma.InputJsonValue,
        process: process as unknown as Prisma.InputJsonValue,
        serviceAreas: serviceAreas as unknown as Prisma.InputJsonValue,
        hours: hours as unknown as Prisma.InputJsonValue,
        offers: offers as unknown as Prisma.InputJsonValue,
        credentials: credentials as unknown as Prisma.InputJsonValue,
        brandColors: brandColors as unknown as Prisma.InputJsonValue,
        images: contentImagesWithCaptions as unknown as Prisma.InputJsonValue,
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
