import { describe, expect, it } from "vitest";
import { selectRelevantPages, ANALYSIS_CHAR_BUDGET } from "./select-relevant-pages";
import type { PageExtraction } from "@/lib/crawl/types";

function page(url: string, title: string, text: string): PageExtraction {
  return { url, title, text, links: [], images: [], logoCandidate: null, favicon: null, ogImage: null };
}

describe("selectRelevantPages", () => {
  it("always includes the homepage first", () => {
    const homepage = page("https://example.com/", "Home", "welcome");
    const other = page("https://example.com/blog/some-post", "A Post", "hello world");
    const selected = selectRelevantPages([homepage, other]);
    expect(selected[0].url).toBe(homepage.url);
  });

  it("returns an empty array for no input pages", () => {
    expect(selectRelevantPages([])).toEqual([]);
  });

  it("caps a single outlier anchor page so ranked non-anchor pages still get budget", () => {
    // Regression test: an anchor (a page that keyword-matches a category like "services")
    // used to be included with no per-page cap, so one unusually large anchor page could
    // alone exceed the whole budget before the ranked pool of individually-named pages
    // (root-canal-treatment, general-dentistry, etc.) ever got a chance to be selected.
    const homepage = page("https://example.com/", "Example Co", "Welcome to Example Co. ".repeat(80));
    const bigServicesIndex = page(
      "https://example.com/services/",
      "Our Services",
      "Service description. ".repeat(6000) // ~132,000 chars — far past the budget alone
    );
    const rankedPage = page(
      "https://example.com/root-canal-treatment/",
      "Root Canal Treatment",
      "Detail about root canals. ".repeat(50)
    );

    const selected = selectRelevantPages([homepage, bigServicesIndex, rankedPage]);

    expect(selected.some((p) => p.url === rankedPage.url)).toBe(true);
    const usedChars = selected.reduce((sum, p) => sum + p.text.length, 0);
    expect(usedChars).toBeLessThan(ANALYSIS_CHAR_BUDGET * 1.5); // capped anchor, not the raw ~132k
  });

  it("dedupes exact-duplicate page text, keeping the first-seen URL", () => {
    const homepage = page("https://example.com/", "Home", "x".repeat(500));
    const dup1 = page("https://example.com/case-study/a", "Case Study A", "identical content here ".repeat(20));
    const dup2 = page(
      "https://example.com/case-studies/case-study/a",
      "Case Study A (dup path)",
      "identical content here ".repeat(20)
    );

    const selected = selectRelevantPages([homepage, dup1, dup2]);
    const urls = selected.map((p) => p.url);
    expect(urls).toContain(dup1.url);
    expect(urls).not.toContain(dup2.url);
  });

  it("respects a custom char budget", () => {
    const homepage = page("https://example.com/", "Home", "short");
    const many = Array.from({ length: 20 }, (_, i) =>
      page(`https://example.com/service-${i}`, `Service ${i}`, "content ".repeat(50))
    );
    const selected = selectRelevantPages([homepage, ...many], 500);
    // Never selects zero beyond the homepage, but the budget keeps it from grabbing everything.
    expect(selected.length).toBeLessThan(many.length + 1);
  });
});
