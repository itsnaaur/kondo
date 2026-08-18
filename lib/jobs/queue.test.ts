import { describe, it, expect } from "vitest";
import { parseAnalyzeSitePayload, parseGeneratePagePayload } from "./queue";

// Task 3.7, constraint 2. Every check needs a test that fails on crafted bad input — these
// two functions exist specifically to replace an unchecked `job.payload as X` cast, so each
// one needs proof it actually rejects a payload shape that cast would have silently accepted.

describe("parseAnalyzeSitePayload", () => {
  it("accepts a real, well-formed payload", () => {
    expect(parseAnalyzeSitePayload({ clientId: "abc", siteUrl: "https://example.com" })).toEqual({
      clientId: "abc",
      siteUrl: "https://example.com",
    });
  });

  it("crafted bad input — a GENERATE_PAGE-shaped payload (missing siteUrl) — throws, does not silently produce siteUrl: undefined", () => {
    expect(() => parseAnalyzeSitePayload({ clientId: "abc" })).toThrow(/siteUrl/);
  });

  it("crafted bad input — null — throws", () => {
    expect(() => parseAnalyzeSitePayload(null)).toThrow();
  });

  it("crafted bad input — a non-object — throws", () => {
    expect(() => parseAnalyzeSitePayload("abc")).toThrow();
  });

  it("crafted bad input — clientId present but wrong type — throws", () => {
    expect(() => parseAnalyzeSitePayload({ clientId: 123, siteUrl: "https://example.com" })).toThrow(/clientId/);
  });
});

describe("parseGeneratePagePayload", () => {
  it("accepts a real, well-formed payload", () => {
    expect(parseGeneratePagePayload({ clientId: "abc" })).toEqual({ clientId: "abc" });
  });

  // The real overlap risk this task's own instruction named: an ANALYZE_SITE payload has
  // every field a GeneratePagePayload check wants (clientId) plus an extra one (siteUrl) — a
  // GENERATE_PAGE case reading an ANALYZE_SITE row's payload by mistake would NOT be caught by
  // a check that only verifies clientId is present. Documented here as a real, known
  // limitation of field-presence validation, not silently assumed airtight.
  it("does NOT reject an ANALYZE_SITE-shaped payload that happens to also carry clientId — a real, disclosed limitation of presence-only validation", () => {
    expect(parseGeneratePagePayload({ clientId: "abc", siteUrl: "https://example.com" })).toEqual({ clientId: "abc" });
  });

  it("crafted bad input — missing clientId — throws", () => {
    expect(() => parseGeneratePagePayload({})).toThrow(/clientId/);
  });

  it("crafted bad input — null — throws", () => {
    expect(() => parseGeneratePagePayload(null)).toThrow();
  });
});
