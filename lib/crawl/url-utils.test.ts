import { describe, expect, it } from "vitest";
import { normalizeUrl, isCrawlableLink } from "./url-utils";

describe("normalizeUrl", () => {
  it("resolves a relative link against the base and strips the hash", () => {
    expect(normalizeUrl("/about#team", "https://example.com/")).toBe("https://example.com/about");
  });

  it("rejects non-http(s) schemes", () => {
    expect(normalizeUrl("mailto:hi@example.com", "https://example.com/")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)", "https://example.com/")).toBeNull();
  });

  it("returns null for an unparseable URL", () => {
    expect(normalizeUrl("::not a url::", "not-a-base")).toBeNull();
  });

  it("strips known tracking params but keeps everything else", () => {
    const result = normalizeUrl(
      "https://example.com/services?utm_source=fb&utm_campaign=x&fbclid=abc&id=42",
      "https://example.com/"
    );
    expect(result).toBe("https://example.com/services?id=42");
  });

  it("is a no-op when there are no tracking params to strip", () => {
    expect(normalizeUrl("https://example.com/services?id=42", "https://example.com/")).toBe(
      "https://example.com/services?id=42"
    );
  });
});

describe("isCrawlableLink", () => {
  const origin = "https://example.com";

  it("rejects a different origin", () => {
    expect(isCrawlableLink("https://evil.com/about", origin)).toBe(false);
  });

  it("rejects known file-download extensions", () => {
    expect(isCrawlableLink("https://example.com/brochure.pdf", origin)).toBe(false);
    expect(isCrawlableLink("https://example.com/logo.svg", origin)).toBe(false);
  });

  it("rejects known download-triggering path shapes", () => {
    expect(isCrawlableLink("https://example.com/bio/vcard/12345", origin)).toBe(false);
  });

  it("accepts an ordinary same-origin page", () => {
    expect(isCrawlableLink("https://example.com/services/root-canal", origin)).toBe(true);
  });
});
