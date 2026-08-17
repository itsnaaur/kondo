// A separate Claude call, deliberately not folded into structure-and-rewrite.ts's extraction
// call (Task 1.8). That call already classifies images (subject/suitableAsHero/confidence,
// see its buildImagesTool) as part of one combined tool — this module exists because the
// role-assignment work ahead of it (Task 1.9) needs a much richer per-image schema (build
// plan §5.3) than extraction's schema can carry without bloating a call whose real job is
// business copy, and because classifying an image is expensive enough to be worth caching
// independently of whether the surrounding business content ever changes.
//
// Reuses, not reimplements: resizeForVisionClassification (lib/content/resize-for-vision.ts)
// for the image payload, withTransientRetry (lib/ai/anthropic-retry.ts) for transient
// failures, normalizeStringifiedJson (lib/ai/json-tool-utils.ts) for the same double-encoding
// defence structure-and-rewrite.ts relies on, and the same index-based lenient-join pattern
// that file's own images array uses (a skipped/malformed index degrades that one image, not
// the whole call).
//
// This module is NOT wired into lib/content/run-analysis.ts in this task — the existing
// embedded classification in structure-and-rewrite.ts is untouched and keeps running as
// before. See this task's log entry (docs/kondo-v2-execution.md, 1.8) for why, and for the
// real, standalone verification this was run through instead.

import Anthropic from "@anthropic-ai/sdk";
import { withTransientRetry } from "@/lib/ai/anthropic-retry";
import { normalizeStringifiedJson } from "@/lib/ai/json-tool-utils";
import { resizeForVisionClassification } from "./resize-for-vision";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import type { ConfidenceLevel } from "./types";

const TOOL_NAME = "classify_images";
const MODEL = "claude-sonnet-5";
// Much smaller than structure-and-rewrite.ts's 16_000 — this call's output is purely a
// handful of short fields per image (a few enums, two numbers, one short caption, one short
// reason), not full business copy. Generous headroom for a realistic per-analysis batch
// (MAX_CANDIDATE_IMAGES in lib/crawl/download-images.ts caps at 10 candidates + 1 logo).
const MAX_OUTPUT_TOKENS = 8_000;
const MAX_ATTEMPTS = 3;

export const IMAGE_CLASSIFICATION_SUBJECT_ENUM = [
  "person", "people", "product", "interior", "exterior", "equipment",
  "abstract", "graphic", "screenshot", "map", "icon",
] as const;
export type ImageClassificationSubject = (typeof IMAGE_CLASSIFICATION_SUBJECT_ENUM)[number];

const SHOT_QUALITY_ENUM = ["professional", "competent", "amateur"] as const;
export type ShotQuality = (typeof SHOT_QUALITY_ENUM)[number];

const CLEAR_SPACE_ENUM = ["none", "left", "right", "top", "bottom", "centre"] as const;
export type ClearSpace = (typeof CLEAR_SPACE_ENUM)[number];

const CONFIDENCE_ENUM = ["low", "medium", "high"] as const;

export type ImageClassification = {
  subject: ImageClassificationSubject;
  isHeadshot: boolean;
  peopleCount: number;
  shotQuality: ShotQuality;
  hasBurnedInText: boolean;
  hasWatermark: boolean;
  focalPoint: { x: number; y: number }; // normalised, 0-1 both axes
  clearSpace: ClearSpace;
  heroSuitable: { suitable: boolean; reason: string };
  caption: string | null; // short; doubles as alt text; null when nothing genuinely useful
  confidence: ConfidenceLevel;
};

export type ClassifyImageInput = {
  assetId: string;
  // Null for manually-uploaded replacements (see Asset.contentHash's own schema comment) —
  // these can never participate in the cross-asset cache, classified fresh every time.
  contentHash: string | null;
  buffer: Buffer;
  nearbyText: string;
};

// Real-call counter, incremented immediately before each Anthropic call this module makes —
// exported so a caller/verification script can confirm caching actually prevented a call,
// not infer it from timing or the absence of an error. This call has the same irreducible
// sampling variance as structure-and-rewrite.ts's extraction call; a second invocation
// "looking the same" is not proof the cache worked unless the call count is observed
// directly to be zero. See this task's log entry for the real verification.
let apiCallCount = 0;
export function resetClassifyImagesCallCount(): void {
  apiCallCount = 0;
}
export function getClassifyImagesCallCount(): number {
  return apiCallCount;
}

function isConfidence(v: unknown): v is ConfidenceLevel {
  return v === "low" || v === "medium" || v === "high";
}
function isSubject(v: unknown): v is ImageClassificationSubject {
  return typeof v === "string" && (IMAGE_CLASSIFICATION_SUBJECT_ENUM as readonly string[]).includes(v);
}
function isShotQuality(v: unknown): v is ShotQuality {
  return typeof v === "string" && (SHOT_QUALITY_ENUM as readonly string[]).includes(v);
}
function isClearSpace(v: unknown): v is ClearSpace {
  return typeof v === "string" && (CLEAR_SPACE_ENUM as readonly string[]).includes(v);
}
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

// Fail-closed default for a skipped/malformed index — same convention as
// structure-and-rewrite.ts's own images array (subject defaults to "abstract", confidence to
// "low"). Only surfaces from a real response that omitted this image's index or from a
// resize failure on this specific buffer; never from a genuinely successful classification.
const FALLBACK_CLASSIFICATION: ImageClassification = {
  subject: "abstract",
  isHeadshot: false,
  peopleCount: 0,
  shotQuality: "amateur",
  hasBurnedInText: false,
  hasWatermark: false,
  focalPoint: { x: 0.5, y: 0.5 },
  clearSpace: "none",
  heroSuitable: { suitable: false, reason: "not classified — missing or malformed in the model's response" },
  caption: null,
  confidence: "low",
};

// Ask what an image is, never what it feels like — no mood, no atmosphere, no brand-fit
// judgement. shotQuality/heroSuitable are the closest this gets to a judgement call, and
// even those are scoped to concrete, checkable facts (focus, lighting, framing, clear space),
// not an impression of quality.
const SYSTEM_PROMPT =
  "You are classifying images for a website content pipeline. For each attached image, report " +
  "only what is literally, objectively true about it — what it depicts, its measurable/visible " +
  "properties. Never describe how it feels, what mood or atmosphere it conveys, or whether it " +
  "fits a brand. Do not guess at the business's intent. shotQuality and heroSuitable are the " +
  "closest this gets to a judgement call, and even those must be grounded in concrete, checkable " +
  "facts — is it in focus, is the lighting controlled, is the framing uncluttered — not a general " +
  "impression of quality.";

function buildTool(): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description:
      "Classify each attached image, identified by its index (0-based, matching the order the " +
      "images appear in). One entry per image — every attached image must get an entry.",
    input_schema: {
      type: "object",
      required: ["images"],
      properties: {
        images: {
          type: "array",
          items: {
            type: "object",
            required: [
              "index", "subject", "isHeadshot", "peopleCount", "shotQuality",
              "hasBurnedInText", "hasWatermark", "focalPoint", "clearSpace",
              "heroSuitable", "confidence",
            ],
            properties: {
              index: { type: "integer", description: "0-based index matching the image's position in the attached order." },
              subject: {
                type: "string",
                enum: IMAGE_CLASSIFICATION_SUBJECT_ENUM,
                description:
                  "What the image literally depicts — a factual category, not an impression. " +
                  "person = one identifiable individual. people = more than one. product = a discrete " +
                  "item/object shot. interior = an indoor space. exterior = an outdoor space, building, " +
                  "or premises. equipment = tools, machinery, or vehicles with no person operating them. " +
                  "abstract = a real photograph whose subject you genuinely cannot determine even looking " +
                  "at it. graphic = an illustration, icon, clip art, pattern, or decorative graphic — not " +
                  "a photograph. screenshot = a captured screen, UI, or app view. map = a map or floor " +
                  "plan. icon = a small symbolic glyph, distinct from a fuller illustration (graphic).",
              },
              isHeadshot: { type: "boolean", description: "True only if this is a close-cropped portrait of one person's face/head-and-shoulders." },
              peopleCount: { type: "integer", description: "The number of distinct people visible. 0 if none." },
              shotQuality: {
                type: "string",
                enum: SHOT_QUALITY_ENUM,
                description:
                  "An objective assessment of photographic/production craft — focus, lighting, exposure, " +
                  "composition — never a subjective impression of the subject, business, or brand. " +
                  "professional = sharp focus, controlled lighting, deliberate composition. competent = " +
                  "acceptably sharp and lit, ordinary composition, plausibly a careful phone photo. " +
                  "amateur = visible technical flaws — blur, harsh or uneven lighting, awkward cropping, " +
                  "poor exposure.",
              },
              hasBurnedInText: {
                type: "boolean",
                description:
                  "True if text is rendered into the image's own pixels — a caption, a label, a price " +
                  "tag, UI chrome, a watermark's own text. False for text that merely appears near the " +
                  "image elsewhere on the page.",
              },
              hasWatermark: { type: "boolean", description: "True if a stock-photo watermark, logo overlay, or copyright mark is visible on the image itself." },
              focalPoint: {
                type: "object",
                required: ["x", "y"],
                properties: {
                  x: { type: "number", description: "Horizontal position of the image's main visual interest, 0 (left edge) to 1 (right edge)." },
                  y: { type: "number", description: "Vertical position of the image's main visual interest, 0 (top edge) to 1 (bottom edge)." },
                },
                description: "Normalised coordinates of where the eye is drawn first — a face, a product, the busiest part of the frame. 0.5/0.5 for an evenly-distributed or centred image.",
              },
              clearSpace: {
                type: "string",
                enum: CLEAR_SPACE_ENUM,
                description: "Which side of the image, if any, is empty/uncluttered enough to place text or UI over it without covering the main subject. none if the whole frame is visually busy.",
              },
              heroSuitable: {
                type: "object",
                required: ["suitable", "reason"],
                properties: {
                  suitable: { type: "boolean", description: "True only if this reads as a wide, high-impact, uncluttered photo suitable for a large hero banner — not a headshot, icon, or narrow/busy image." },
                  reason: { type: "string", description: "One short, factual sentence — the concrete visual reason (framing, clear space, subject) it is or isn't hero-suitable. Not a mood or brand-fit judgement." },
                },
                description: "Whether this specific image works as a large hero banner, and the concrete visual reason why.",
              },
              caption: {
                type: ["string", "null"],
                description: "A short, factual, literal description of what's visibly depicted — doubles as alt text. Null if nothing genuinely useful can be said.",
              },
              confidence: { type: "string", enum: CONFIDENCE_ENUM, description: "Your confidence in this classification overall." },
            },
          },
        },
      },
    },
  };
}

function resolveClassifications(raw: unknown[], count: number): ImageClassification[] {
  const byIndex = new Map<number, Record<string, unknown>>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.index === "number") byIndex.set(e.index, e);
  }

  const out: ImageClassification[] = [];
  for (let index = 0; index < count; index++) {
    const e = byIndex.get(index);
    if (!e) {
      out.push(FALLBACK_CLASSIFICATION);
      continue;
    }
    const focalPointRaw = e.focalPoint as Record<string, unknown> | undefined;
    const focalPoint =
      focalPointRaw && typeof focalPointRaw.x === "number" && typeof focalPointRaw.y === "number"
        ? { x: clamp01(focalPointRaw.x), y: clamp01(focalPointRaw.y) }
        : { x: 0.5, y: 0.5 };
    const heroSuitableRaw = e.heroSuitable as Record<string, unknown> | undefined;
    const heroSuitable =
      heroSuitableRaw && typeof heroSuitableRaw.suitable === "boolean" && typeof heroSuitableRaw.reason === "string"
        ? { suitable: heroSuitableRaw.suitable, reason: heroSuitableRaw.reason }
        : { suitable: false, reason: "not classified — missing or malformed in the model's response" };

    out.push({
      subject: isSubject(e.subject) ? e.subject : "abstract",
      isHeadshot: typeof e.isHeadshot === "boolean" ? e.isHeadshot : false,
      peopleCount: typeof e.peopleCount === "number" && Number.isFinite(e.peopleCount) ? Math.max(0, Math.round(e.peopleCount)) : 0,
      shotQuality: isShotQuality(e.shotQuality) ? e.shotQuality : "amateur",
      hasBurnedInText: typeof e.hasBurnedInText === "boolean" ? e.hasBurnedInText : false,
      hasWatermark: typeof e.hasWatermark === "boolean" ? e.hasWatermark : false,
      focalPoint,
      clearSpace: isClearSpace(e.clearSpace) ? e.clearSpace : "none",
      heroSuitable,
      caption: typeof e.caption === "string" && e.caption.trim() ? e.caption.trim() : null,
      confidence: isConfidence(e.confidence) ? e.confidence : "low",
    });
  }
  return out;
}

// One real Claude call for a whole batch (matching structure-and-rewrite.ts's own
// one-call-for-every-attached-image shape) — not chunked, since a realistic batch from
// lib/crawl/download-images.ts is already capped at 11 images (MAX_CANDIDATE_IMAGES=10 plus
// the logo). A caller passing a much larger batch would need to chunk it itself; not built
// here since nothing in this codebase currently produces one.
//
// Retries (MAX_ATTEMPTS) are spent only on whole-response failures — no tool_use block,
// truncation, an unparseable images field — never on a single image's malformed fields,
// which resolveClassifications degrades leniently instead. Exhausting every attempt throws,
// the same "core failure" behaviour structure-and-rewrite.ts gives its own required fields —
// this call has no non-image content to protect, so there's no lenient sub-path to fall back
// to the way that file's images array has.
async function classifyBatch(
  items: { base64: string; mediaType: "image/jpeg"; nearbyText: string }[]
): Promise<ImageClassification[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tool = buildTool();

  const imageContentBlocks: Anthropic.ContentBlockParam[] = items.flatMap((c, i) => [
    {
      type: "text" as const,
      text: `[${i}]${c.nearbyText.trim() ? " " + c.nearbyText.trim().slice(0, 300) : ""}`,
    },
    {
      type: "image" as const,
      source: { type: "base64" as const, media_type: c.mediaType, data: c.base64 },
    },
  ]);

  let correctionNote: string | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      apiCallCount++;
      const result = await withTransientRetry(`classify-images attempt ${attempt}`, async () => {
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          output_config: { effort: "high" },
          system: SYSTEM_PROMPT,
          tools: [tool],
          tool_choice: { type: "tool", name: TOOL_NAME },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Classify each attached image, by index:" },
                ...imageContentBlocks,
                ...(correctionNote
                  ? [
                      {
                        type: "text" as const,
                        text: `IMPORTANT: your previous attempt was rejected: ${correctionNote}. Re-read the tool schema and include every required field this time.`,
                      },
                    ]
                  : []),
              ],
            },
          ],
        });
        return stream.finalMessage();
      });

      console.log(
        `[classify-images] attempt ${attempt}: stop_reason=${result.stop_reason} output_tokens=${result.usage.output_tokens}/${MAX_OUTPUT_TOKENS}`
      );
      if (result.stop_reason === "max_tokens") throw new Error("response truncated at max_tokens");

      const toolUse = result.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === TOOL_NAME
      );
      if (!toolUse) throw new Error("no tool_use block in response");

      const raw = normalizeStringifiedJson(toolUse.input) as Record<string, unknown>;
      if (!Array.isArray(raw.images)) throw new Error("images field missing or not an array");

      return resolveClassifications(raw.images, items.length);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[classify-images] attempt ${attempt} failed: ${lastError.message}`);
    }
  }

  throw lastError ?? new Error("classify-images: all attempts failed with no captured error");
}

async function findCachedClassification(contentHash: string): Promise<ImageClassification | null> {
  // Global lookup, not scoped to a client — "classified once, ever" per Task 1.8's own
  // instruction, since saveAsset's own dedup (lib/crawl/download-images.ts) is scoped per
  // client, so the same stock/theme image downloaded for two different clients gets two
  // different Asset rows with the same contentHash. Prisma's `where: { contentHash: null }`
  // would generate `IS NULL` and match every null-hash row indiscriminately — this function
  // is only ever called with a real, non-null hash (see classifyImages below), so that
  // failure mode never triggers.
  const cached = await prisma.asset.findFirst({
    where: { contentHash, classification: { not: Prisma.DbNull } },
    select: { classification: true },
  });
  return cached ? (cached.classification as unknown as ImageClassification) : null;
}

async function persistClassification(assetId: string, classification: ImageClassification): Promise<void> {
  await prisma.asset.update({
    where: { id: assetId },
    data: { classification: classification as unknown as Prisma.InputJsonValue },
  });
}

// Classifies every image in the batch, using the cross-asset contentHash cache wherever
// possible and calling Claude only for what's genuinely uncached. Every image, cached or
// freshly classified, gets its own Asset row updated — a cache hit still costs one write
// (to this row) but zero API calls.
export async function classifyImages(images: ClassifyImageInput[]): Promise<Map<string, ImageClassification>> {
  const results = new Map<string, ImageClassification>();
  // In-batch dedup — two images in the same call sharing a contentHash (a photo used twice
  // on one site) should classify once, not twice, without needing a second database round
  // trip for the duplicate.
  const resolvedByHash = new Map<string, ImageClassification>();

  const toClassify: { input: ClassifyImageInput; base64: string; mediaType: "image/jpeg" }[] = [];

  for (const img of images) {
    if (img.contentHash) {
      const inBatch = resolvedByHash.get(img.contentHash);
      if (inBatch) {
        results.set(img.assetId, inBatch);
        await persistClassification(img.assetId, inBatch);
        continue;
      }
      const cached = await findCachedClassification(img.contentHash);
      if (cached) {
        results.set(img.assetId, cached);
        resolvedByHash.set(img.contentHash, cached);
        await persistClassification(img.assetId, cached);
        continue;
      }
    }

    try {
      const { base64, mediaType } = await resizeForVisionClassification(img.buffer);
      toClassify.push({ input: img, base64, mediaType });
    } catch (err) {
      // resizeForVisionClassification throws on a malformed buffer rather than failing
      // closed itself — caught here so one corrupt image doesn't take down classification
      // for every other image in the batch.
      console.error(`[classify-images] resize failed for asset ${img.assetId}:`, err);
      results.set(img.assetId, FALLBACK_CLASSIFICATION);
      await persistClassification(img.assetId, FALLBACK_CLASSIFICATION);
    }
  }

  if (toClassify.length > 0) {
    const fresh = await classifyBatch(toClassify.map((c) => ({ base64: c.base64, mediaType: c.mediaType, nearbyText: c.input.nearbyText })));
    for (let i = 0; i < toClassify.length; i++) {
      const { input } = toClassify[i];
      const classification = fresh[i];
      results.set(input.assetId, classification);
      if (input.contentHash) resolvedByHash.set(input.contentHash, classification);
      await persistClassification(input.assetId, classification);
    }
  }

  return results;
}
