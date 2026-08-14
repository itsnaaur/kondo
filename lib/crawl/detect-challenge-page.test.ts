import { describe, expect, it } from "vitest";
import { isLikelyChallengePage } from "./detect-challenge-page";

describe("isLikelyChallengePage", () => {
  it("catches the confirmed live case (offrisklegaltemplates.com.au)", () => {
    const title = "Robot Challenge Screen";
    const text =
      "offrisklegaltemplates.com.au\n\nChecking the site connection security\n\n" +
      "This page requires cookies to be enabled in your browser settings. " +
      "Please check this setting and enable cookies (if disabled)";
    expect(isLikelyChallengePage(title, text)).toBe(true);
  });

  it("catches common Cloudflare-style interstitials by title alone", () => {
    expect(isLikelyChallengePage("Just a moment...", "")).toBe(true);
    expect(isLikelyChallengePage("Attention Required! | Cloudflare", "some short body")).toBe(true);
  });

  it("catches a distinctive body phrase on a short page even with a generic title", () => {
    const title = "offrisklegaltemplates.com.au";
    const text = "Ray ID: 8a1b2c3d4e5f6789 — Performance & security by Cloudflare";
    expect(isLikelyChallengePage(title, text)).toBe(true);
  });

  it("does not flag a real, substantial business page", () => {
    const title = "Off Risk Legal Templates — Legal document templates made simple";
    const text =
      "We provide affordable, lawyer-drafted legal templates for small businesses. " +
      "Our services include contract templates, terms and conditions, and privacy " +
      "policies. ".repeat(30);
    expect(isLikelyChallengePage(title, text)).toBe(false);
  });

  it("does not flag a long, legitimate page that merely mentions cookies in passing", () => {
    const title = "Privacy Policy";
    const text =
      "This site requires cookies to be enabled for certain features to work correctly. " +
      "We collect the following information... ".repeat(60); // well over the short-page limit
    expect(isLikelyChallengePage(title, text)).toBe(false);
  });
});
