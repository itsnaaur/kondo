import Anthropic from "@anthropic-ai/sdk";
import { withTransientRetry } from "@/lib/ai/anthropic-retry";
import { normalizeStringifiedJson } from "@/lib/ai/json-tool-utils";
import type {
  ContentService,
  ContentTestimonial,
  ContentStat,
  ContentFaq,
  ContentDifferentiator,
  ContentProcessStep,
  ContentServiceArea,
  ContentHours,
  ContentOffer,
  ContentCredential,
  ConfidenceLevel,
  ImageSubject,
} from "./types";
import { ANALYSIS_CHAR_BUDGET } from "./select-relevant-pages";

const TOOL_NAME = "structure_site_content";
const MAX_ATTEMPTS = 3;
// Raised from 8192 after adding serviceAreas/hours/offers/credentials on top of an already
// large schema (services/testimonials/stats/faqs/differentiators/process) — Princeton alone
// now returns 16 full-length service descriptions, and a bigger client with offers and
// credentials too has real headroom to hit the old ceiling. A truncated tool response fails
// validateShape and burns a retry, same failure class as the omitted-empty-key issue this
// schema already worked around once.
const MAX_OUTPUT_TOKENS = 16_000;
// Not a hard cutoff — just a signal to watch for once real clients start exercising the
// bigger schema, so a truncation risk shows up in logs before it shows up as a client
// stuck on ANALYSIS_FAILED.
const NEAR_LIMIT_WARN_THRESHOLD = 0.9;

const CONFIDENCE_ENUM = ["low", "medium", "high"] as const;
// "unknown" deliberately removed — it was a pass-through bucket that isDecorativePhoto/
// sceneImages (content-guards.ts, filter-junk-images.ts) never excluded the way they
// exclude "abstract", which is how clip-art icons and a blown-up wordmark ended up
// rendering as real content on CL Financial. Now that the model can actually see each
// image, there's no case where it has nothing to go on — "abstract" is the fail-closed
// answer for both "this is decorative/an icon" and "I genuinely can't tell what this is."
const IMAGE_SUBJECT_ENUM = ["people", "place", "work", "product", "abstract"] as const;

// One image candidate offered to the AI for classification. imageBase64/mediaType are a
// pre-resized (see resize-for-vision.ts) JPEG attached to the call as a real image content
// block — nearbyText (alt text + nearest-ancestor text, lib/crawl/types.ts) is still passed
// alongside it since it carries information the pixels can't (a name, a job title, which
// service a photo illustrates), not because the model can't see the image.
export type ImageCandidateInput = { assetId: string; nearbyText: string; imageBase64: string; mediaType: "image/jpeg" };

// The SDK types Tool.InputSchema.properties as bare `unknown` (it's arbitrary JSON
// Schema) — that's correct for the wire format but unusable for spreading/composing the
// schema in TS, so these builders work with a concrete Record and get cast once at the
// single point they're assigned into the real Tool object.
type ToolProperties = Record<string, unknown>;

function buildImagesTool(imageCandidates: ImageCandidateInput[]): ToolProperties {
  if (imageCandidates.length === 0) return {};
  return {
    images: {
      type: "array",
      description:
        "One entry per image attached below, identified by its index (0-based, matching the order the " +
        "images appear in). Every attached image must get an entry — you can see each one, so there's no " +
        "case where there's nothing to classify.",
      items: {
        type: "object",
        required: ["index", "subject", "suitableAsHero", "confidence"],
        properties: {
          index: { type: "integer", description: "0-based index matching the image's position in the attached order." },
          caption: {
            type: ["string", "null"],
            description:
              "A short, natural caption describing what's actually in the photo. Use the alt text/surrounding " +
              "text alongside what you can see to add detail the pixels alone don't give you (a name, a job " +
              "title, which specific service this illustrates) — but the caption must describe the real " +
              "content of the image, not just restate nearby text. Null if you can't produce something " +
              "genuinely useful.",
          },
          subject: {
            type: "string",
            enum: IMAGE_SUBJECT_ENUM,
            description:
              "people = a real photo of person/people (staff, customers). place = a location/premises/" +
              "exterior — hero-shaped. work = a finished project/product-in-use — gallery-shaped. product = " +
              "a discrete product/item shot. abstract = anything that is NOT a real photograph of the " +
              "business — icons, illustrations, clip art, logos, decorative graphics, stock/pattern imagery " +
              "— or a real photo whose subject you genuinely can't determine even looking at it. This is the " +
              "fail-closed choice: if you're not confident it's a real, on-topic photo of the business, " +
              "choose abstract rather than guessing at people/place/work/product.",
          },
          suitableAsHero: {
            type: "boolean",
            description: "True only if this reads like a wide, landscape-shaped, high-impact photo of the place/premises/team in action — not a headshot, icon, or narrow banner.",
          },
          confidence: { type: "string", enum: CONFIDENCE_ENUM },
        },
      },
    },
  };
}

const STRUCTURE_TOOL_BASE_PROPERTIES: ToolProperties = {
  businessName: { type: "string", description: "The business's actual name, not the site's <title> if that includes taglines/boilerplate." },
  businessNameConfidence: { type: "string", enum: CONFIDENCE_ENUM },
  tagline: { type: "string", description: "One punchy sentence capturing what they do and for whom. Rewritten, not copied verbatim." },
  taglineConfidence: { type: "string", enum: CONFIDENCE_ENUM },
  aboutCopy: { type: "string", description: "2-4 sentences, rewritten to be sharper and more confident than the source copy." },
  aboutCopyConfidence: { type: "string", enum: CONFIDENCE_ENUM },
  detectedIndustry: {
    type: "string",
    description: "A short industry/category label (e.g. \"local service\", \"medical/clinic\", \"SaaS\", \"hospitality\", \"professional services\", \"education\") used to pick a template.",
  },
  contactAddress: { type: ["string", "null"], description: "Street address if present anywhere in the crawled text, else null. Do not guess." },
  contactAddressConfidence: { type: "string", enum: CONFIDENCE_ENUM },
  ctaLabel: {
    type: ["string", "null"],
    description:
      "The site's own recurring call-to-action button/link label, in their words — \"Book an appointment\", " +
      "\"Request a quote\", \"Get started\". Only return one if it clearly recurs across the site (their " +
      "actual button text), not your own generic phrasing and not a one-off link caption you're not " +
      "confident represents their standard CTA. Null is the correct answer when nothing recurs clearly.",
  },
  ctaLabelConfidence: { type: "string", enum: CONFIDENCE_ENUM },
  testimonials: {
    type: "array",
    description: "Genuine customer testimonials/reviews found in the text. Do not invent any. Flag anything that might actually be a staff bio, a case study blurb, or otherwise not a real customer quote.",
    items: {
      type: "object",
      required: ["quote", "author", "confidence", "flagged"],
      properties: {
        quote: { type: "string" },
        author: { type: "string" },
        role: { type: "string" },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean" },
        flagReason: { type: "string" },
      },
    },
  },
  stats: {
    type: "array",
    description:
      "Trust-band numbers found in the text — \"25 years\", \"120+ projects completed\", \"15,000 patients " +
      "treated\". Only numbers actually stated in the source; never estimate or round up to sound better. " +
      "Empty array is the correct answer if the site states none.",
    items: {
      type: "object",
      required: ["value", "label", "confidence", "flagged"],
      properties: {
        value: { type: "string", description: "The number/figure as it should display, e.g. \"25+\", \"15,000\"." },
        label: { type: "string", description: "What the number counts, e.g. \"Years in business\", \"Patients treated\"." },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean", description: "Always true — a wrong number in a prospect-facing mockup is worse than no number, so every stat gets a human's confirmation regardless of confidence." },
        flagReason: { type: "string" },
      },
    },
  },
  faqs: {
    type: "array",
    description: "Genuine FAQ question/answer pairs found in the text. Do not invent questions nobody asked — only ones the source actually poses and answers.",
    items: {
      type: "object",
      required: ["question", "answer", "confidence", "flagged"],
      properties: {
        question: { type: "string" },
        answer: { type: "string" },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean" },
        flagReason: { type: "string" },
      },
    },
  },
  differentiators: {
    type: "array",
    description:
      "\"Why choose us\" points — distinct from services (what they offer). Look for a section that reads " +
      "like a pitch for why THIS business over a competitor, not a service listing. Don't manufacture these " +
      "from aboutCopy if the source doesn't actually present them as a distinct list — empty array is fine.",
    items: {
      type: "object",
      required: ["title", "description", "confidence", "flagged"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean" },
        flagReason: { type: "string" },
      },
    },
  },
  process: {
    type: "array",
    description:
      "\"How it works\" / \"Our approach\" steps, if the site presents its process as a distinct numbered or " +
      "titled sequence. Roughly half of sites won't have this — empty array is the normal, correct answer, " +
      "not a missed extraction.",
    items: {
      type: "object",
      required: ["title", "description", "confidence", "flagged"],
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean" },
        flagReason: { type: "string" },
      },
    },
  },
  serviceAreas: {
    type: "array",
    description:
      "Suburbs/cities/regions the business explicitly says it serves — \"servicing Brisbane, Gold Coast and " +
      "Logan\", a coverage map's labelled areas, a list of branch locations. One entry per named area. Do " +
      "NOT infer a service area from the business's own street address alone — only areas the source text " +
      "actually names as covered or served. Empty array is correct if the site never names one.",
    items: {
      type: "object",
      required: ["name", "confidence", "flagged"],
      properties: {
        name: { type: "string", description: "The area as named, e.g. \"Gold Coast\", \"Brisbane and surrounds\"." },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean", description: "Always true — see stats above for the reasoning." },
        flagReason: { type: "string" },
      },
    },
  },
  hours: {
    type: "array",
    description:
      "Opening hours / availability if the source states them — a table, a line like \"Mon-Fri 9am-5pm\", or " +
      "\"By appointment only\" / \"Open 24/7\". One entry per distinct day or day-range as stated. Never " +
      "invent a schedule the source doesn't give.",
    items: {
      type: "object",
      required: ["days", "hours", "confidence", "flagged"],
      properties: {
        days: { type: "string", description: "e.g. \"Mon–Fri\", \"Saturday\", \"Public holidays\"." },
        hours: { type: "string", description: "e.g. \"8:00am–5:00pm\", \"Closed\", \"By appointment\"." },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean", description: "Always true — see stats above for the reasoning." },
        flagReason: { type: "string" },
      },
    },
  },
  offers: {
    type: "array",
    description:
      "Specific priced offers/packages/promotions found in the text — \"$199 new patient check-up\", " +
      "\"free quote\", \"10% off first service\". Only ones with an actual price or concrete deal stated; a " +
      "service that merely sounds good value is a service, not an offer — don't duplicate the services list " +
      "here. Never invent a price.",
    items: {
      type: "object",
      required: ["name", "price", "confidence", "flagged"],
      properties: {
        name: { type: "string", description: "What the offer is, e.g. \"New patient check-up\"." },
        price: { type: "string", description: "The price/deal as stated, e.g. \"$199\", \"Free\", \"10% off\"." },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean", description: "Always true — a wrong price is worse than no price." },
        flagReason: { type: "string" },
      },
    },
  },
  credentials: {
    type: "array",
    description:
      "Licenses, registrations, certifications, or accreditation memberships explicitly stated in the text — " +
      "\"AHPRA registered\", \"certified Gallagher partner\", \"registered NDIS provider\". The text form of a " +
      "trust badge, for a site with no partner logos to crawl. Do NOT infer a credential from the business " +
      "type or industry norms (e.g. don't assume \"AHPRA registered\" just because it's a dental clinic) — " +
      "only ones the source explicitly states.",
    items: {
      type: "object",
      required: ["label", "confidence", "flagged"],
      properties: {
        label: { type: "string" },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean", description: "Always true — see stats above for the reasoning." },
        flagReason: { type: "string" },
      },
    },
  },
  // services deliberately comes LAST, not first. Confirmed live against Princeton Dental: with
  // services positioned before the other array fields, a forced tool call correctly filled all 16
  // services but returned every other array — testimonials/stats/faqs/differentiators/process —
  // completely empty, even though the source text plainly contained stats ("25+ Years serving
  // Kenmore families", "5 Star Google review rating") and six FAQ questions. Not a token-limit
  // truncation (stop_reason was "tool_use", output nowhere near max_tokens) — services is simply the
  // biggest, most effortful array to fill, and coming first it seems to exhaust whatever attention
  // the model has left for the smaller trust-signal fields that follow. Moving services to the end
  // fixed it completely on the same input: stats/faqs/differentiators all came back correctly
  // populated, services stayed at 16/16. If a future schema addition reintroduces this failure mode,
  // check field order before assuming it's a token-budget or page-selection problem.
  services: {
    type: "array",
    description:
      "The distinct services/products offered. Rewrite descriptions to be punchy, not copy-pasted. " +
      "If a service is only named in the source (e.g. a menu/nav listing) with no real description " +
      "anywhere in the text, still write one short, genuine line inferred from the service name and " +
      "general industry context — never leave description blank or a bare restatement of the name. " +
      "A reviewer editing a plausible draft is a much lower bar than a reviewer writing from scratch. " +
      "Still mark it low confidence and flagged: true with flagReason noting the description is inferred, " +
      "not sourced, so the reviewer knows to verify it.",
    items: {
      type: "object",
      required: ["name", "description", "confidence", "flagged"],
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        confidence: { type: "string", enum: CONFIDENCE_ENUM },
        flagged: { type: "boolean" },
        flagReason: { type: "string" },
      },
    },
  },
};

function buildStructureTool(imageCandidates: ImageCandidateInput[]): Anthropic.Tool {
  return {
    name: TOOL_NAME,
    description:
      "Read this business's crawled website text and produce structured, sales-ready content: " +
      "who they are, what they offer, and proof they're good at it. Rewrite copy to be " +
      "punchier and clearer than the source — this is going straight onto a landing page.",
    input_schema: {
      type: "object",
      required: [
        "businessName",
        "businessNameConfidence",
        "tagline",
        "taglineConfidence",
        "aboutCopy",
        "aboutCopyConfidence",
        "detectedIndustry",
        "contactAddress",
        "contactAddressConfidence",
        "ctaLabel",
        "ctaLabelConfidence",
        "testimonials",
        "stats",
        "faqs",
        "differentiators",
        "process",
        "serviceAreas",
        "hours",
        "offers",
        "credentials",
        "services",
        ...(imageCandidates.length > 0 ? ["images"] : []),
      ],
      properties: {
        ...STRUCTURE_TOOL_BASE_PROPERTIES,
        ...buildImagesTool(imageCandidates),
      } as Anthropic.Tool["input_schema"]["properties"],
    },
  };
}

export type StructuredImageResult = {
  assetId: string;
  caption: string | null;
  subject: ImageSubject;
  suitableAsHero: boolean;
  confidence: ConfidenceLevel;
};

export type StructuredContentResult = {
  businessName: string;
  businessNameConfidence: ConfidenceLevel;
  tagline: string;
  taglineConfidence: ConfidenceLevel;
  aboutCopy: string;
  aboutCopyConfidence: ConfidenceLevel;
  detectedIndustry: string;
  contactAddress: string | null;
  contactAddressConfidence: ConfidenceLevel;
  ctaLabel: string | null;
  ctaLabelConfidence: ConfidenceLevel;
  services: Omit<ContentService, "id">[];
  testimonials: Omit<ContentTestimonial, "id">[];
  stats: Omit<ContentStat, "id">[];
  faqs: Omit<ContentFaq, "id">[];
  differentiators: Omit<ContentDifferentiator, "id">[];
  process: Omit<ContentProcessStep, "id">[];
  serviceAreas: Omit<ContentServiceArea, "id">[];
  hours: Omit<ContentHours, "id">[];
  offers: Omit<ContentOffer, "id">[];
  credentials: Omit<ContentCredential, "id">[];
  images: StructuredImageResult[];
};

function isConfidence(v: unknown): v is ConfidenceLevel {
  return v === "low" || v === "medium" || v === "high";
}

function isImageSubject(v: unknown): v is ImageSubject {
  return typeof v === "string" && (IMAGE_SUBJECT_ENUM as readonly string[]).includes(v);
}

// Only the core fields (business/services/etc.) fail the whole attempt and trigger a
// retry — see the loop below. Stats/faqs/differentiators/process/images are validated
// leniently in resolveStructuredContent() instead: a malformed or partial image
// classification (the newest, most speculative part of this schema) should never block
// business-critical extraction that already worked.
function validateShape(input: unknown): { valid: true; value: Record<string, unknown> } | { valid: false; reason: string } {
  if (!input || typeof input !== "object") return { valid: false, reason: "tool input is not an object" };
  const v = input as Record<string, unknown>;

  if (typeof v.businessName !== "string" || !v.businessName.trim()) return { valid: false, reason: "missing businessName" };
  if (!isConfidence(v.businessNameConfidence)) return { valid: false, reason: "missing/invalid businessNameConfidence" };
  if (typeof v.tagline !== "string" || !v.tagline.trim()) return { valid: false, reason: "missing tagline" };
  if (!isConfidence(v.taglineConfidence)) return { valid: false, reason: "missing/invalid taglineConfidence" };
  if (typeof v.aboutCopy !== "string" || !v.aboutCopy.trim()) return { valid: false, reason: "missing aboutCopy" };
  if (!isConfidence(v.aboutCopyConfidence)) return { valid: false, reason: "missing/invalid aboutCopyConfidence" };
  if (typeof v.detectedIndustry !== "string" || !v.detectedIndustry.trim()) return { valid: false, reason: "missing detectedIndustry" };
  if (v.contactAddress !== null && typeof v.contactAddress !== "string") return { valid: false, reason: "contactAddress must be string or null" };
  if (!isConfidence(v.contactAddressConfidence)) return { valid: false, reason: "missing/invalid contactAddressConfidence" };
  if (v.ctaLabel !== null && typeof v.ctaLabel !== "string") return { valid: false, reason: "ctaLabel must be string or null" };
  if (!isConfidence(v.ctaLabelConfidence)) return { valid: false, reason: "missing/invalid ctaLabelConfidence" };

  // services/testimonials are deliberately NOT hard-required here, despite being in the
  // tool's `required` list — confirmed live that once the schema grew to include several
  // more required array fields (stats/faqs/differentiators/process/images), the model
  // started occasionally omitting a key entirely rather than emitting [] when that field
  // was genuinely empty for a given business (e.g. a client with zero real testimonials
  // and zero stats and zero FAQs simultaneously). Hard-failing the whole extraction over
  // a correctly-empty array wastes all 3 retry attempts on an unfixable "error" and often
  // still fails at the end. resolveStructuredContent() below coerces a missing/malformed
  // array to [] for every array field, services/testimonials included — the same
  // leniency stats/faqs/differentiators/process/images already had. serviceAreas/hours/
  // offers/credentials get the identical leniency: all four are commonly empty (a SaaS
  // company has no "hours", plenty of sites name no service area), same as
  // stats/faqs/differentiators/process before them.

  return { valid: true, value: v };
}

function coerceTextArray<T extends { confidence: ConfidenceLevel; flagged: boolean; flagReason?: string }>(
  raw: unknown,
  fields: (keyof T)[],
  forceFlagged?: boolean
): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (fields.some((f) => typeof e[f as string] !== "string")) continue;
    const item = { ...e, confidence: isConfidence(e.confidence) ? e.confidence : "low" } as T;
    if (forceFlagged) item.flagged = true;
    else item.flagged = typeof e.flagged === "boolean" ? e.flagged : false;
    out.push(item);
  }
  return out;
}

// Leniently resolves the speculative parts of the schema against the imageCandidates that
// were actually offered — an AI response that skips an image, uses a bad index, or omits
// the whole images array degrades to "unknown/low-confidence" for the affected images
// rather than failing the entire structuring call.
function resolveStructuredContent(raw: Record<string, unknown>, imageCandidates: ImageCandidateInput[]): StructuredContentResult {
  const services = coerceTextArray<Omit<ContentService, "id">>(raw.services, ["name", "description"]);
  const testimonials = coerceTextArray<Omit<ContentTestimonial, "id">>(raw.testimonials, ["quote", "author"]);
  const stats = coerceTextArray<Omit<ContentStat, "id">>(raw.stats, ["value", "label"], true);
  const faqs = coerceTextArray<Omit<ContentFaq, "id">>(raw.faqs, ["question", "answer"]);
  const differentiators = coerceTextArray<Omit<ContentDifferentiator, "id">>(raw.differentiators, ["title", "description"]);
  const process = coerceTextArray<Omit<ContentProcessStep, "id">>(raw.process, ["title", "description"]);
  // Forced flagged: true on all four, same as stats — new-field territory, unproven
  // against real data yet, so every entry gets a human's eyes before it ships.
  const serviceAreas = coerceTextArray<Omit<ContentServiceArea, "id">>(raw.serviceAreas, ["name"], true);
  const hours = coerceTextArray<Omit<ContentHours, "id">>(raw.hours, ["days", "hours"], true);
  const offers = coerceTextArray<Omit<ContentOffer, "id">>(raw.offers, ["name", "price"], true);
  const credentials = coerceTextArray<Omit<ContentCredential, "id">>(raw.credentials, ["label"], true);

  const byIndex = new Map<number, Record<string, unknown>>();
  if (Array.isArray(raw.images)) {
    for (const entry of raw.images) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.index === "number") byIndex.set(e.index, e);
    }
  }

  const images: StructuredImageResult[] = imageCandidates.map((candidate, index) => {
    const e = byIndex.get(index);
    return {
      assetId: candidate.assetId,
      caption: e && typeof e.caption === "string" && e.caption.trim() ? e.caption.trim() : null,
      // Fails closed the same way the enum itself does now: a skipped index or a bad
      // subject value in the response is exactly the kind of uncertainty that should
      // exclude the image, not wave it through the way the old "unknown" default did.
      subject: e && isImageSubject(e.subject) ? e.subject : "abstract",
      suitableAsHero: e && typeof e.suitableAsHero === "boolean" ? e.suitableAsHero : false,
      confidence: e && isConfidence(e.confidence) ? e.confidence : "low",
    };
  });

  return {
    businessName: raw.businessName as string,
    businessNameConfidence: raw.businessNameConfidence as ConfidenceLevel,
    tagline: raw.tagline as string,
    taglineConfidence: raw.taglineConfidence as ConfidenceLevel,
    aboutCopy: raw.aboutCopy as string,
    aboutCopyConfidence: raw.aboutCopyConfidence as ConfidenceLevel,
    detectedIndustry: raw.detectedIndustry as string,
    contactAddress: (raw.contactAddress as string | null) ?? null,
    contactAddressConfidence: raw.contactAddressConfidence as ConfidenceLevel,
    ctaLabel: (raw.ctaLabel as string | null) ?? null,
    ctaLabelConfidence: raw.ctaLabelConfidence as ConfidenceLevel,
    services,
    testimonials,
    stats,
    faqs,
    differentiators,
    process,
    serviceAreas,
    hours,
    offers,
    credentials,
    images,
  };
}

const SYSTEM_PROMPT = `You are helping an agency turn a prospect's existing website into sales-ready content \
for a landing-page mockup. You are not designing anything — a human-built template will \
render whatever you produce. Your job is purely: read, structure, and rewrite.

Rules:
- Never invent facts. If something isn't in the crawled text, leave it null/empty and mark \
low confidence rather than guessing. This applies doubly to stats — a wrong number in a \
prospect-facing mockup damages credibility more than a missing one, so only report numbers \
actually stated in the source text.
- Testimonials must be real quotes found in the text. If something looks like a staff bio, \
a case study, or isn't clearly a customer speaking, include it but set flagged: true with a reason.
- Rewrite the tagline and about copy to be punchier and more confident than the source — \
this is the one place you should improve on the original, not just transcribe it.
- A service named without any real description anywhere in the source (a bare menu/nav \
listing) still needs a genuine one-line description, not a blank or a restatement of the \
name — infer it plausibly from the name and industry context, mark it low confidence and \
flagged, and say in flagReason that it's inferred rather than sourced.
- detectedIndustry should be a short, common label a human would recognize (e.g. "local \
service", "medical/clinic", "SaaS", "hospitality", "professional services", "education").
- Image classification: each image is attached below the text it was found near — actually \
look at it. Use the alt text/surrounding text to add detail the pixels alone don't give you \
(a name, a job title, which service a photo illustrates), not as a substitute for looking. \
If it's not a real, on-topic photograph of the business — an icon, illustration, clip art, \
logo, decorative graphic, or anything you can't confidently place — classify it "abstract" \
rather than guessing. Fail closed: an uncertain "people/place/work/product" is worse than a \
correct "abstract", because everything downstream trusts subject to decide what's safe to \
show a prospect.
- Differentiators are "why choose us" points, not a restatement of services. Process steps \
are a "how it works" sequence. Both are commonly absent — empty arrays are normal, correct \
answers, not missed extractions.
- Service areas are places the business explicitly says it serves (e.g. "servicing \
Brisbane, Gold Coast and Logan") — never infer these from a street address alone; a clinic \
at one address doesn't imply it "serves" that suburb in the marketing sense.
- Hours are only ones actually stated — a table, a line of text, or "by appointment only" \
— never invent a schedule the source doesn't give.
- Offers must have an actual price or concrete deal stated in the text; a service \
description that merely sounds like good value is not an offer, and shouldn't appear in \
both services and offers.
- Credentials/certifications/registrations must be explicitly stated in the text — never \
infer one from the business type or industry norms, even when it would almost certainly be \
true (e.g. don't assume "AHPRA registered" just because it's a dental clinic).
- ctaLabel is the site's own recurring call-to-action phrasing (their actual button text), \
not a generic one you'd write yourself — null is correct when nothing recurs clearly \
enough to be confident it's their standard phrase rather than a one-off link caption.`;

export async function structureAndRewriteContent(
  pageTexts: { url: string; title: string; text: string }[],
  imageCandidates: ImageCandidateInput[] = []
): Promise<StructuredContentResult> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // select-relevant-pages.ts already spent a 40k-char budget choosing which pages to
  // include — this used to independently re-clip the combined result down to 15k
  // regardless, silently throwing away everything that budget deliberately selected (most
  // individual service pages on a site of any size). The +8k here is headroom for the
  // "--- title (url) ---\n" header/join overhead per page, not a second content budget —
  // this should essentially never trigger under normal selection.
  const combinedText = pageTexts
    .map((p) => `--- ${p.title || p.url} (${p.url}) ---\n${p.text}`)
    .join("\n\n")
    .slice(0, ANALYSIS_CHAR_BUDGET + 8_000);

  // Real image content blocks, not a text description of them — each candidate is a short
  // "[index] alt text" label immediately followed by the actual (pre-resized, see
  // resize-for-vision.ts) image, so the model can see exactly what it's classifying while
  // whatever alt/nearby text exists sits right next to it for extra context (a name, a job
  // title) rather than being the only signal available.
  const imageContentBlocks: Anthropic.ContentBlockParam[] = imageCandidates.flatMap((c, i) => [
    {
      type: "text" as const,
      text: `[${i}]${c.nearbyText.trim() ? " " + c.nearbyText.trim().slice(0, 300) : ""}`,
    },
    {
      type: "image" as const,
      source: { type: "base64" as const, media_type: c.mediaType, data: c.imageBase64 },
    },
  ]);

  const structureTool = buildStructureTool(imageCandidates);

  let lastError: Error | null = null;
  let correctionNote: string | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await withTransientRetry(`structure-and-rewrite attempt ${attempt}`, async () => {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-5",
          max_tokens: MAX_OUTPUT_TOKENS,
          output_config: { effort: "high" },
          system: SYSTEM_PROMPT,
          tools: [structureTool],
          tool_choice: { type: "tool", name: TOOL_NAME },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: `Crawled site text:\n\n${combinedText}` },
                ...(imageContentBlocks.length > 0
                  ? [{ type: "text" as const, text: "\n\nImages found on the site (classify each by index):" }, ...imageContentBlocks]
                  : []),
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
        `[structure-and-rewrite] attempt ${attempt}: stop_reason=${result.stop_reason} ` +
        `output_tokens=${result.usage.output_tokens}/${MAX_OUTPUT_TOKENS}`
      );
      if (result.stop_reason === "max_tokens") {
        throw new Error("Content structuring was cut off by the token limit.");
      }
      if (result.usage.output_tokens >= MAX_OUTPUT_TOKENS * NEAR_LIMIT_WARN_THRESHOLD) {
        console.warn(
          `[structure-and-rewrite] output tokens near limit: ${result.usage.output_tokens}/${MAX_OUTPUT_TOKENS} ` +
          `— a client with a slightly larger response would truncate here.`
        );
      }

      const toolUse = result.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      const normalized = toolUse ? normalizeStringifiedJson(toolUse.input) : null;
      const validation = validateShape(normalized);

      if (!validation.valid) {
        console.error(`[structure-and-rewrite] attempt ${attempt}/${MAX_ATTEMPTS} invalid shape: ${validation.reason}`);
        throw new Error(`Claude did not return valid structured content: ${validation.reason}`);
      }

      return resolveStructuredContent(validation.value, imageCandidates);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      correctionNote = lastError.message;
      console.error(`[structure-and-rewrite] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, lastError.message);
    }
  }

  throw lastError ?? new Error("Content structuring failed after all attempts");
}
