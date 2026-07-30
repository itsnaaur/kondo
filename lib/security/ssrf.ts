import dns from "node:dns/promises";
import net from "node:net";
import type { LookupAddress } from "node:dns";

// This app fetches arbitrary client-supplied URLs server-side (crawler, screenshot
// capture, image download) with a headless browser and with plain fetch. Unrestricted,
// that reaches cloud metadata endpoints (169.254.169.254) and anything on the private
// network the server can see. This module is the blocklist/allowlist layer; the
// structural fix — running captures on a host with no private network route — is a
// deployment concern tracked separately (see the background-worker task).

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

// Hostnames blocked outright regardless of what they resolve to.
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

const BLOCKED_IPV4_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // RFC1918 private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local — includes the cloud metadata endpoint
  ["172.16.0.0", 12], // RFC1918 private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // RFC1918 private
  ["198.18.0.0", 15], // benchmark testing
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved
];

function ipv4ToInt(ip: string): number {
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function isIpv4InCidr(ip: string, cidrBase: string, prefixLen: number): boolean {
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(cidrBase) & mask);
}

export function isBlockedIpv4(ip: string): boolean {
  return BLOCKED_IPV4_CIDRS.some(([base, prefix]) => isIpv4InCidr(ip, base, prefix));
}

export function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true; // unspecified / loopback
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local, fc00::/7
  if (["fe8", "fe9", "fea", "feb"].some((p) => normalized.startsWith(p))) return true; // link-local, fe80::/10
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — unwrap and apply the v4 rules.
  const v4Mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isBlockedIpv4(v4Mapped[1]);
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedIpv4(ip);
  if (version === 6) return isBlockedIpv6(ip);
  return true; // not a recognisable IP — fail closed
}

export type SsrfCheckResult = { safe: true } | { safe: false; reason: string };

// Validates scheme, then resolves DNS and checks every returned address. This is
// defense in depth, not the sole control — validating a hostname and then letting
// Playwright resolve it again moments later is a DNS-rebinding TOCTOU gap. The
// per-request guard below (installSsrfGuard) re-runs this same check on every actual
// network request Playwright makes, including redirects, which closes most of that gap
// without needing an egress proxy.
export async function checkUrlIsSafe(rawUrl: string): Promise<SsrfCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: "not a valid URL" };
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return { safe: false, reason: `scheme ${parsed.protocol} is not allowed` };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: `hostname ${hostname} is blocked` };
  }

  if (net.isIP(hostname)) {
    return isBlockedIp(hostname)
      ? { safe: false, reason: `IP ${hostname} is in a blocked range` }
      : { safe: true };
  }

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return { safe: false, reason: `could not resolve hostname ${hostname}` };
  }

  if (addresses.length === 0) {
    return { safe: false, reason: `hostname ${hostname} resolved to no addresses` };
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      return { safe: false, reason: `hostname ${hostname} resolves to blocked address ${address}` };
    }
  }

  return { safe: true };
}

const MAX_REDIRECTS = 5;

// Intercepts every request a Playwright page makes — navigation, redirects, and any
// subresource or script-triggered fetch — and re-validates each one. This is what
// actually satisfies "re-validate after every redirect": a public URL that 302s to a
// blocked address is caught here even though the original URL passed checkUrlIsSafe.
export async function installSsrfGuard(
  target: import("playwright").Page | import("playwright").BrowserContext
): Promise<void> {
  await target.route("**/*", async (route) => {
    const request = route.request();

    let depth = 0;
    let redirectedFrom = request.redirectedFrom();
    while (redirectedFrom) {
      depth++;
      redirectedFrom = redirectedFrom.redirectedFrom();
    }
    if (depth > MAX_REDIRECTS) {
      console.error(`[ssrf] blocked ${request.url()}: exceeded ${MAX_REDIRECTS} redirects`);
      await route.abort("blockedbyclient");
      return;
    }

    const result = await checkUrlIsSafe(request.url());
    if (!result.safe) {
      console.error(`[ssrf] blocked request to ${request.url()}: ${result.reason}`);
      await route.abort("blockedbyclient");
      return;
    }

    await route.continue();
  });
}
