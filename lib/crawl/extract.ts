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

    function scoreLogoImg(img: HTMLImageElement): number {
      const alt = (img.getAttribute("alt") || "").toLowerCase();
      const cls = (img.className || "").toString().toLowerCase();
      const id = (img.id || "").toLowerCase();
      const src = (img.getAttribute("src") || "").toLowerCase();
      let score = 0;
      if (alt.includes("logo")) score += 3;
      if (cls.includes("logo")) score += 3;
      if (id.includes("logo")) score += 3;
      if (src.includes("logo")) score += 2;
      if (img.closest("header")) score += 2;
      if (img.closest("nav")) score += 1;
      return score;
    }

    const logoCandidate =
      Array.from(document.querySelectorAll("img[src]"))
        .map((el) => el as HTMLImageElement)
        .filter((img) => !img.src.startsWith("data:"))
        .map((img) => ({ src: img.src, score: scoreLogoImg(img) }))
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.src ?? null;

    const faviconEl = document.querySelector(
      'link[rel~="icon"]'
    ) as HTMLLinkElement | null;
    const favicon = faviconEl?.href || null;

    const ogImageContent = document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute("content");
    let ogImage: string | null = null;
    if (ogImageContent) {
      try {
        ogImage = new URL(ogImageContent, document.baseURI).href;
      } catch {
        ogImage = null;
      }
    }

    return {
      title: document.title,
      text: document.body?.innerText ?? "",
      links,
      images,
      logoCandidate,
      favicon,
      ogImage,
      samples: selectors.map((selector) => ({ selector, style: computedOf(selector) })),
      generatorMeta,
      scriptSrcs,
      linkHrefs,
      hasDataAOS: document.querySelectorAll("[data-aos]").length > 0,
      hasForm: document.querySelectorAll("form").length > 0,
    };
  }, STYLE_SELECTORS);
}
