import { checkUrlIsSafe } from "@/lib/security/ssrf";

export async function fetchRobotsDisallowPaths(origin: string): Promise<string[]> {
  try {
    const robotsUrl = new URL("/robots.txt", origin).toString();
    const check = await checkUrlIsSafe(robotsUrl);
    if (!check.safe) {
      console.error(`[crawl] refusing to fetch robots.txt at ${robotsUrl}: ${check.reason}`);
      return [];
    }

    const res = await fetch(robotsUrl);
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
