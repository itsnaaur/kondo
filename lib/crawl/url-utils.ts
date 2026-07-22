const SKIP_EXTENSIONS =
  /\.(pdf|jpg|jpeg|png|gif|svg|webp|zip|rar|mp4|mp3|wav|doc|docx|xls|xlsx|ppt|pptx|css|js|ico|woff|woff2|ttf|eot|xml|json)$/i;

export function normalizeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function isCrawlableLink(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.origin !== origin) return false;
    if (SKIP_EXTENSIONS.test(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function slugFor(url: string, index: number): string {
  const { pathname } = new URL(url);
  const cleaned =
    pathname
      .replace(/\/+$/, "")
      .replace(/[^a-zA-Z0-9/-]/g, "")
      .replace(/\//g, "-")
      .replace(/^-+/, "") || "home";
  return `${String(index).padStart(3, "0")}-${cleaned}`.slice(0, 80);
}
