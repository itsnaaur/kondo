import { describe, expect, it } from "vitest";
import { isBlockedIpv4, isBlockedIpv6, isBlockedIp } from "./ssrf";

// Scoped to the pure, synchronous IP-classification functions only — checkUrlIsSafe
// itself does a real DNS lookup, which would make this test network-dependent and flaky.
// This is exactly the part of the SSRF guard where a wrong CIDR boundary silently opens
// (or closes) a real hole, so it's worth pinning down with explicit cases.

describe("isBlockedIpv4", () => {
  it("blocks the cloud metadata endpoint", () => {
    expect(isBlockedIpv4("169.254.169.254")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isBlockedIpv4("10.0.0.1")).toBe(true);
    expect(isBlockedIpv4("172.16.5.5")).toBe(true);
    expect(isBlockedIpv4("192.168.1.1")).toBe(true);
  });

  it("blocks loopback", () => {
    expect(isBlockedIpv4("127.0.0.1")).toBe(true);
  });

  it("allows an ordinary public address", () => {
    expect(isBlockedIpv4("8.8.8.8")).toBe(false);
    expect(isBlockedIpv4("93.184.216.34")).toBe(false);
  });

  it("respects CIDR boundaries precisely (172.16/12, not the whole 172.x)", () => {
    expect(isBlockedIpv4("172.15.255.255")).toBe(false); // just outside 172.16.0.0/12
    expect(isBlockedIpv4("172.32.0.1")).toBe(false); // just outside on the other side
    expect(isBlockedIpv4("172.31.255.255")).toBe(true); // last address inside the range
  });
});

describe("isBlockedIpv6", () => {
  it("blocks loopback and unspecified", () => {
    expect(isBlockedIpv6("::1")).toBe(true);
    expect(isBlockedIpv6("::")).toBe(true);
  });

  it("blocks unique-local and link-local ranges", () => {
    expect(isBlockedIpv6("fd00::1")).toBe(true);
    expect(isBlockedIpv6("fe80::1")).toBe(true);
  });

  it("unwraps an IPv4-mapped address and applies the v4 rules", () => {
    expect(isBlockedIpv6("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedIpv6("::ffff:8.8.8.8")).toBe(false);
  });

  it("allows an ordinary public IPv6 address", () => {
    expect(isBlockedIpv6("2001:4860:4860::8888")).toBe(false);
  });
});

describe("isBlockedIp", () => {
  it("fails closed on something that isn't a recognisable IP", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });

  it("dispatches to the right family", () => {
    expect(isBlockedIp("10.0.0.1")).toBe(true);
    expect(isBlockedIp("::1")).toBe(true);
    expect(isBlockedIp("8.8.8.8")).toBe(false);
  });
});
