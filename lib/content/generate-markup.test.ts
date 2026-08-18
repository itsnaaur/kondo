import { describe, it, expect } from "vitest";
import {
  auditMarkup,
  buildImageManifest,
  toMarkupDesignInput,
  filterMarkupContent,
  type MarkupContentInput,
} from "./generate-markup";
import { CLASS_VOCABULARY } from "@/lib/design/generate-stylesheet";
import type { ResolveDesignSystemResult } from "@/lib/design/resolve-design-system";
import type { RoleAssignment, RoleAssignmentInput } from "./assign-image-roles";
import { buildPalette } from "@/lib/content/normalize-brand-colors";
import { resolveTypography } from "@/lib/design/resolve-typography";
import { resolveTemplateTokens, resolveStyleBundle } from "@/lib/design/resolve-tokens";

// Task 3.4. Tests only the pure, non-network parts of generate-markup.ts — auditMarkup,
// buildImageManifest, toMarkupDesignInput, filterMarkupContent. generateMarkup itself is a
// real Anthropic API call; it is verified against real client data in this task's own log
// entry, not mocked here — mocking the model response would test the parsing code against a
// fabricated shape, not against what the model actually does, which is exactly the thing this
// task's own done-when needs real evidence for.

function knownClasses(): Set<string> {
  const set = new Set<string>();
  for (const entry of CLASS_VOCABULARY) for (const t of entry.className.split(".").filter(Boolean)) set.add(t);
  return set;
}

describe("auditMarkup — constraint 4: no colour, no <style>, no banned tags", () => {
  const classes = knownClasses();

  it("clean markup produces no error findings", () => {
    const html = `<section class="surface-paper section" data-kondo-section="hero"><div class="container"><h1>Hi</h1></div></section>`;
    const findings = auditMarkup(html, classes);
    expect(findings.filter((f) => f.severity === "error")).toEqual([]);
  });

  it("flags a <style> tag", () => {
    const findings = auditMarkup(`<section data-kondo-section="hero"><style>.x{color:red}</style></section>`, classes);
    expect(findings.some((f) => f.message.includes("<style>"))).toBe(true);
  });

  it("flags an inline style attribute", () => {
    const findings = auditMarkup(`<section data-kondo-section="hero"><div style="color:red">Hi</div></section>`, classes);
    expect(findings.some((f) => f.message.includes("inline style"))).toBe(true);
  });

  it("flags a hex colour literal even outside style=", () => {
    const findings = auditMarkup(`<section data-kondo-section="hero">Brand colour is #ff0000</section>`, classes);
    expect(findings.some((f) => f.message.includes("hex colour"))).toBe(true);
  });

  it("flags an rgb()/hsl() colour function", () => {
    const findings = auditMarkup(`<section data-kondo-section="hero">background: rgb(255, 0, 0)</section>`, classes);
    expect(findings.some((f) => f.message.includes("colour function"))).toBe(true);
  });

  it("flags each banned tag", () => {
    for (const tag of ["script", "iframe", "object", "embed", "form"]) {
      const findings = auditMarkup(`<section data-kondo-section="hero"><${tag}></${tag}></section>`, classes);
      expect(findings.some((f) => f.message.includes(`<${tag}>`)), tag).toBe(true);
    }
  });

  it("flags an inline event handler attribute", () => {
    const findings = auditMarkup(`<section data-kondo-section="hero"><button onclick="alert(1)">Go</button></section>`, classes);
    expect(findings.some((f) => f.message.includes("event handler"))).toBe(true);
  });

  it("flags a javascript: URI", () => {
    const findings = auditMarkup(`<section data-kondo-section="hero"><a href="javascript:alert(1)">Go</a></section>`, classes);
    expect(findings.some((f) => f.message.includes("javascript:"))).toBe(true);
  });
});

describe("auditMarkup — constraint 1: data-kondo-section coverage", () => {
  const classes = knownClasses();

  it("flags zero markers at all as an error", () => {
    const findings = auditMarkup(`<section class="surface-paper"><h1>Hi</h1></section>`, classes);
    expect(findings.some((f) => f.severity === "error" && f.message.includes("no data-kondo-section"))).toBe(true);
  });

  it("warns when a top-level section is missing its marker (count mismatch)", () => {
    const html = `<section data-kondo-section="hero">A</section><section>B</section>`;
    const findings = auditMarkup(html, classes);
    expect(findings.some((f) => f.severity === "warning" && f.message.includes("may be missing one"))).toBe(true);
  });

  it("no warning when every top-level tag has a marker", () => {
    const html = `<header data-kondo-section="nav">A</header><section data-kondo-section="hero">B</section><footer data-kondo-section="footer">C</footer>`;
    const findings = auditMarkup(html, classes);
    expect(findings.some((f) => f.message.includes("may be missing one"))).toBe(false);
  });
});

describe("auditMarkup — constraint 2: class vocabulary conformance", () => {
  it("flags a class not in CLASS_VOCABULARY", () => {
    const findings = auditMarkup(`<section data-kondo-section="hero" class="totally-invented-class">Hi</section>`, knownClasses());
    expect(findings.some((f) => f.message.includes("totally-invented-class"))).toBe(true);
  });

  it("does not flag real vocabulary classes, including compound ones like btn btn--solid", () => {
    const html = `<section data-kondo-section="hero" class="surface-mist section"><a class="btn btn--solid">Go</a></section>`;
    const findings = auditMarkup(html, knownClasses());
    expect(findings.some((f) => f.message.startsWith("classes not in CLASS_VOCABULARY"))).toBe(false);
  });
});

describe("toMarkupDesignInput — colour is structurally unreachable", () => {
  function fakeDesignSystem(): ResolveDesignSystemResult {
    const palette = buildPalette([{ hex: "#2563eb" }]);
    const typography = resolveTypography({ moodSignals: [], positioningTier: "mainstream" });
    const tokens = resolveTemplateTokens();
    const styleBundle = resolveStyleBundle();
    return {
      ok: true,
      system: {
        vertical: "medical-dental",
        palette,
        typography,
        tokens,
        styleBundle,
        patternEligibility: { status: "works", reasons: [] },
      },
    };
  }

  it("the returned object has no palette field to read a colour from", () => {
    const input = toMarkupDesignInput(fakeDesignSystem());
    expect("palette" in input).toBe(false);
    expect("tokens" in input).toBe(false);
    expect(input.vertical).toBe("medical-dental");
    expect(input.styleBundleName).toBeTypeOf("string");
  });

  it("ok:false (NeutralSystem) resolves vertical:null and patternEligibility:null", () => {
    const palette = buildPalette([]);
    const typography = resolveTypography({ moodSignals: [], positioningTier: "mainstream" });
    const tokens = resolveTemplateTokens();
    const styleBundle = resolveStyleBundle();
    const result: ResolveDesignSystemResult = {
      ok: false,
      reason: "no-vertical-match",
      partial: { palette, typography, tokens, styleBundle },
    };
    const input = toMarkupDesignInput(result);
    expect(input.vertical).toBeNull();
    expect(input.patternEligibility).toBeNull();
  });
});

describe("filterMarkupContent — drops flagged items, keeps everything else", () => {
  const CONTENT: MarkupContentInput = {
    businessName: "Acme",
    tagline: null,
    aboutCopy: null,
    ctaLabel: null,
    contactPhone: null,
    contactEmail: null,
    contactAddress: null,
    services: [
      { id: "1", name: "Kept", description: "d", confidence: "high", flagged: false },
      { id: "2", name: "Dropped", description: "d", confidence: "low", flagged: true },
    ],
    testimonials: [],
    stats: [],
    faqs: [],
    differentiators: [],
    process: [],
    serviceAreas: [],
    hours: [],
    offers: [],
    credentials: [],
  };

  it("keeps unflagged items, drops flagged ones", () => {
    const result = filterMarkupContent(CONTENT);
    expect(result.services).toHaveLength(1);
    expect(result.services[0].name).toBe("Kept");
  });

  it("passes scalar fields through unchanged", () => {
    const result = filterMarkupContent(CONTENT);
    expect(result.businessName).toBe("Acme");
  });
});

describe("buildImageManifest — the new Asset+RoleAssignment join", () => {
  const inputs: RoleAssignmentInput[] = [
    { assetId: "a1", assetType: "IMAGE", metrics: { width: 800, height: 600, aspectRatio: 1.33, orientation: "landscape", fileSizeBytes: 1, bytesPerPixel: 1, hasAlpha: false, colorEntropy: 5 } as never, classification: { subject: "exterior", isHeadshot: false, peopleCount: 0, shotQuality: "professional", hasBurnedInText: false, hasWatermark: false, focalPoint: { x: 0.5, y: 0.5 }, clearSpace: "none", heroSuitable: { suitable: true, reason: "x" }, caption: "A storefront", confidence: "high" } },
    { assetId: "a2", assetType: "IMAGE", metrics: null, classification: null },
  ];
  const assignments: RoleAssignment[] = [
    { assetId: "a1", role: "hero", reason: "best geometry" },
    { assetId: "a2", role: "unusable", reason: "too small" },
  ];
  const urlByAssetId = new Map([
    ["a1", "https://example.com/a1.jpg"],
    ["a2", "https://example.com/a2.jpg"],
  ]);

  it("excludes unusable-role assets entirely — never offered to the model", () => {
    const manifest = buildImageManifest(inputs, assignments, urlByAssetId);
    expect(manifest.find((m) => m.assetId === "a2")).toBeUndefined();
  });

  it("joins url, role, dimensions, subject, caption-as-alt-text, and focalPoint for a usable asset", () => {
    const manifest = buildImageManifest(inputs, assignments, urlByAssetId);
    expect(manifest).toEqual([
      { assetId: "a1", url: "https://example.com/a1.jpg", role: "hero", widthPx: 800, heightPx: 600, subject: "exterior", altText: "A storefront", focalPoint: { x: 0.5, y: 0.5 } },
    ]);
  });

  it("skips an assigned asset with no known URL rather than emitting a broken entry", () => {
    const manifest = buildImageManifest(inputs, assignments, new Map());
    expect(manifest).toEqual([]);
  });

  // Task 3.7c — focalPoint was silently dropped before; confirm the null-classification case
  // (metrics-only fallback role assignment, no vision classification at all) degrades to
  // focalPoint: null rather than throwing or fabricating a value.
  it("focalPoint is null for a usable asset with no classification", () => {
    const noClsInputs: RoleAssignmentInput[] = [
      { assetId: "a3", assetType: "IMAGE", metrics: { width: 900, height: 700, aspectRatio: 1.29, orientation: "landscape", fileSizeBytes: 1, bytesPerPixel: 1, hasAlpha: false, colorEntropy: 5 } as never, classification: null },
    ];
    const noClsAssignments: RoleAssignment[] = [{ assetId: "a3", role: "gallery", reason: "no classification; usable dimensions" }];
    const manifest = buildImageManifest(noClsInputs, noClsAssignments, new Map([["a3", "https://example.com/a3.jpg"]]));
    expect(manifest).toEqual([
      { assetId: "a3", url: "https://example.com/a3.jpg", role: "gallery", widthPx: 900, heightPx: 700, subject: null, altText: null, focalPoint: null },
    ]);
  });
});
