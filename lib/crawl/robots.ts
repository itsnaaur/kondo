import { checkUrlIsSafe } from "@/lib/security/ssrf";

// Matches downloadImage's FETCH_TIMEOUT_MS (lib/crawl/download-images.ts) — a robots.txt
// fetch is a small, incidental step before the real crawl, so it shouldn't be able to hang
// the single-job-at-a-time worker (scripts/worker.ts) any longer than a real image fetch
// can.
const FETCH_TIMEOUT_MS = 10_000;

export async function fetchRobotsDisallowPaths(origin: string): Promise<string[]> {
  try {
    const robotsUrl = new URL("/robots.txt", origin).toString();
    const check = await checkUrlIsSafe(robotsUrl);
    if (!check.safe) {
      console.error(`[crawl] refusing to fetch robots.txt at ${robotsUrl}: ${check.reason}`);
      return [];
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(robotsUrl, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) return [];
    const text = await res.text();

    const disallows: string[] = [];
    let inWildcardGroup = false;

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (/^user-agent:/i.test(line)) {
        inWildcardGroup = line.toLowerCase().includes("*");
      } else if (inWildcardGroup && /^disallow:/i.test(line)) {
        const rulePath = line.split(":").slice(1).join(":").trim();
        if (rulePath) disallows.push(rulePath);
      }
    }

    return disallows;
  } catch {
    return [];
  }
}

export function isDisallowed(pathname: string, disallowRules: string[]): boolean {
  return disallowRules.some((rule) => pathname.startsWith(rule));
}
