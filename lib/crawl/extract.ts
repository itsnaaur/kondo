import type { Page } from "playwright";

export async function extractPageData(page: Page) {
  // Deliberately no named function declarations/consts inside this callback. Under
  // tsx/esbuild's name-preservation transform, a named function gets wrapped with a call
  // to an injected __name() helper — fine in the Node process where that helper is
  // defined, but page.evaluate() serializes this callback's source to run inside the
  // browser, where __name doesn't exist, producing "ReferenceError: __name is not
  // defined". Next.js's own compiler doesn't do this, so the bug only appeared once this
  // code ran under the standalone (tsx-based) worker. Inlining the logic as anonymous
  // arrows avoids it entirely.
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href]")).map(
      (a) => (a as HTMLAnchorElement).href
    );
    // Nearest ancestor with actual text, walked up a bounded number of levels — a bare
    // wrapper <div> around just the image has empty textContent, so this keeps climbing
    // until it hits a container that has some (e.g. a "We accept" heading sitting next to
    // a row of logos), capped so it can't walk all the way to a large section/the body.
    // Inlined directly in the map callback rather than a separate named const/function —
    // see the note at the top of this file on why that breaks under page.evaluate().
    const images = Array.from(document.querySelectorAll("img[src]")).map((el) => {
      const img = el as HTMLImageElement;
      const alt = img.getAttribute("alt") || "";
      let ancestorText = "";
      let ancestor = img.parentElement;
      let depth = 0;
      while (ancestor && depth < 4) {
        const t = (ancestor.textContent || "").trim();
        if (t.length > 10) {
          ancestorText = t.slice(0, 500);
          break;
        }
        ancestor = ancestor.parentElement;
        depth++;
      }
      const nearbyText = [alt, ancestorText].filter(Boolean).join(" ");
      return { src: img.src, nearbyText };
    });

    const logoCandidate =
      Array.from(document.querySelectorAll("img[src]"))
        .map((el) => el as HTMLImageElement)
        .filter((img) => !img.src.startsWith("data:"))
        .map((img) => {
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
          return { src: img.src, score };
        })
        .filter((c) => c.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.src ?? null;

    const faviconEl = document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null;
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
    };
  });
}
