import { escapeHtml } from "./escape-html";

// Appended to every rendered concept, no matter which template or how it's reached
// (gallery thumbnail, full preview, published link, downloaded file) — a template author
// only ever exports a plain string-building function, never something that assembles a
// full HTML document itself, so this line can't be forgotten or bypassed. Using someone's
// logo and photos to pitch them is normal in agency land, but the label costs nothing and
// prevents an awkward conversation about why their branding is on this page.
const DISCLOSURE_TEXT = "Concept preview by JRNY Digital, using publicly available branding.";

// Always-inlined regardless of which template is rendering — a sane CSS reset plus the
// disclosure footer's own styling, so no template author needs to remember to reset
// margins or style the footer themselves.
const SHELL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { -webkit-font-smoothing: antialiased; }
  img { max-width: 100%; display: block; }
  .jrny-disclosure {
    text-align: center;
    padding: 14px 16px;
    font: 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #9ca3af;
    background: #111827;
  }
`;

export function renderShell({
  title,
  css,
  bodyHtml,
  bodyClass,
  headExtra,
}: {
  title: string;
  css: string;
  bodyHtml: string;
  // Both optional and unused by saas/local-service — added for ledger, which scopes all
  // of its CSS under body.tpl-ledger and needs a Google Fonts <link> in <head>. A
  // template-specific body class/head snippet is trusted, template-author-controlled
  // content (not prospect data), so it's injected as-is, not escaped like the title is.
  bodyClass?: string;
  headExtra?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<!-- Belt-and-braces alongside the X-Robots-Tag header the /p/[slug] route sets — this
     meta tag travels with the HTML itself, including in the downloaded file. -->
<meta name="robots" content="noindex, nofollow" />
<title>${escapeHtml(title || "Concept preview")}</title>
${headExtra ?? ""}
<style>${SHELL_CSS}
${css}</style>
</head>
<body${bodyClass ? ` class="${escapeHtml(bodyClass)}"` : ""}>
${bodyHtml}
<footer class="jrny-disclosure">${escapeHtml(DISCLOSURE_TEXT)}</footer>
</body>
</html>`;
}
