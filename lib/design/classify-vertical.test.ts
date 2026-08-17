import { describe, it, expect } from "vitest";
import { classifyVertical } from "./classify-vertical";

// Task 3.2a. classify-vertical.ts (Task 3.2) never had its own test file — its two real gaps
// were found by 3.3's real 5-client run, not by any test. This file exists specifically to
// pin the two fixed cases against the exact real text that exposed them, plus the false-
// positive risk the fix deliberately guards against.

describe("classifyVertical — 3.2a fix 1: separator/whitespace normalization", () => {
  it("BC Security's real detectedIndustry — 'security / systems' (slash + spaces) now matches 'security systems'", () => {
    expect(classifyVertical("commercial security / systems integration")).toBe("trades-construction");
  });

  it("a hyphenated variant matches identically", () => {
    expect(classifyVertical("commercial security-systems integration")).toBe("trades-construction");
  });

  it("extra/irregular whitespace doesn't prevent a match", () => {
    expect(classifyVertical("security    systems   integration")).toBe("trades-construction");
  });
});

describe("classifyVertical — 3.2a fix 2: 'law' as a standalone keyword, word-boundary safe", () => {
  it("Allen Evans' real detectedIndustry — 'professional services (family law)' — now resolves legal, not financial-professional-services", () => {
    expect(classifyVertical("professional services (family law)")).toBe("legal");
  });

  it("'family law' alone (no 'law firm'/'legal'/other keyword present) still resolves legal", () => {
    expect(classifyVertical("family law practice")).toBe("legal");
  });

  it("the false-positive risk the word-boundary switch guards against: 'lawn care' does NOT match legal", () => {
    expect(classifyVertical("residential lawn care and landscaping")).not.toBe("legal");
    // Resolves trades-construction instead, via the real "landscaping" keyword — proving this
    // isn't a null-vs-legal question, 'law' genuinely doesn't fire on 'lawn'.
    expect(classifyVertical("residential lawn care and landscaping")).toBe("trades-construction");
  });
});

describe("classifyVertical — existing behaviour unchanged (regression guard)", () => {
  it("legal still wins its own established priority-order tie-break test", () => {
    expect(classifyVertical("combined legal and accounting firm")).toBe("legal");
  });

  it("a plain word keyword still matches case-insensitively", () => {
    expect(classifyVertical("PREMIUM WATERPROOFING CONTRACTOR")).toBe("trades-construction");
  });

  it("null and unmatched text still return null", () => {
    expect(classifyVertical(null)).toBeNull();
    expect(classifyVertical("artisanal candle subscription box curation")).toBeNull();
  });
});
