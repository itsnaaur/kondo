import type { Page } from "playwright";

const STYLE_SELECTORS = ["body", "h1", "h2", "h3", "a", "button", "header", "footer", "nav", "p"];

export async function extractPageData(page: Page) {
  return page.evaluate((selectors: string[]) => {
    function computedOf(selector: string) {
      const el = document.querySelector(selector);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        color: cs.color || null,
        backgroundColor: cs.backgroundColor || null,
        fontFamily: cs.fontFamily || null,
        fontSize: cs.fontSize || null,
        fontWeight: cs.fontWeight || null,
      };
    }

    const links = Array.from(document.querySelectorAll("a[href]")).map(
      (a) => (a as HTMLAnchorElement).href
    );
    const images = Array.from(document.querySelectorAll("img[src]")).map(
      (img) => (img as HTMLImageElement).src
    );
    const scriptSrcs = Array.from(document.querySelectorAll("script[src]")).map(
      (s) => (s as HTMLScriptElement).src
    );
    const linkHrefs = Array.from(document.querySelectorAll("link[href]")).map(
      (l) => (l as HTMLLinkElement).href
    );

    const generatorMeta =
      document.querySelector('meta[name="generator"]')?.getAttribute("content") ?? null;

    return {
      title: document.title,
      text: document.body?.innerText ?? "",
      links,
      images,
      samples: selectors.map((selector) => ({ selector, style: computedOf(selector) })),
      generatorMeta,
      scriptSrcs,
      linkHrefs,
      hasDataAOS: document.querySelectorAll("[data-aos]").length > 0,
      hasForm: document.querySelectorAll("form").length > 0,
    };
  }, STYLE_SELECTORS);
}
