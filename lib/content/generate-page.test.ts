import { describe, it, expect } from "vitest";
import { wrapGeneratedPage, capabilitySummaryFrom } from "./generate-page";

// Task 3.7. Tests the pure, non-network parts of generate-page.ts — wrapGeneratedPage and
// capabilitySummaryFrom. generatePageInBackground itself is a real orchestration function
// (real DB reads, a real Anthropic call) verified against real data in this task's own log
// entry (a full, real two-phase run), not mocked here — same reasoning 3.4's own test file
// gave for not mocking generateMarkup.

describe("wrapGeneratedPage — the successful-generation shell", () => {
  it("produces a complete, self-contained document", () => {
    const html = wrapGeneratedPage("Acme Co", ":root { --accent: red; }", "<section>hi</section>");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<style>");
    expect(html).toContain(":root { --accent: red; }");
    expect(html).toContain("<section>hi</section>");
    expect(html).toContain("</html>");
  });

  it("includes the same JRNY disclosure footer every other Concept.html carries", () => {
    const html = wrapGeneratedPage("Acme Co", "", "<section></section>");
    expect(html).toContain("Concept preview by JRNY Digital, using publicly available branding.");
  });

  it("sets noindex/nofollow, matching every other Concept.html's real posture", () => {
    const html = wrapGeneratedPage("Acme Co", "", "<section></section>");
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
  });

  it("escapes the title — no raw HTML injection via businessName", () => {
    const html = wrapGeneratedPage(`<script>alert(1)</script>`, "", "<section></section>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("does NOT emit a Google Fonts <link> — the real stylesheet's own @import already covers it (Task 3.5a)", () => {
    const html = wrapGeneratedPage("Acme Co", "@import url(\"https://fonts.googleapis.com/x\");\n:root{}", "<section></section>");
    expect(html).not.toContain("<link");
    expect(html).toContain('@import url("https://fonts.googleapis.com/x");');
  });
});

describe("capabilitySummaryFrom — real role-assignment counting, not a re-derivation", () => {
  it("counts each role correctly", () => {
    const summary = capabilitySummaryFrom([
      { role: "hero" },
      { role: "gallery" },
      { role: "gallery" },
      { role: "logo" },
      { role: "unusable" },
    ]);
    expect(summary).toEqual({
      heroGrade: 1,
      sectionBackgroundGrade: 0,
      galleryGrade: 2,
      teamGrade: 0,
      featureInlineGrade: 0,
      unusable: 1,
      logoPresent: true,
    });
  });

  it("an empty assignment list produces an all-zero, logo-absent summary", () => {
    expect(capabilitySummaryFrom([])).toEqual({
      heroGrade: 0,
      sectionBackgroundGrade: 0,
      galleryGrade: 0,
      teamGrade: 0,
      featureInlineGrade: 0,
      unusable: 0,
      logoPresent: false,
    });
  });
});
