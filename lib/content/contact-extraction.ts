import type { FieldFlag } from "./types";

const EMAIL_TEXT_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_TEXT_REGEX = /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/;

export type ContactExtraction = {
  email: string | null;
  emailFlag: FieldFlag | null;
  phone: string | null;
  phoneFlag: FieldFlag | null;
};

const LOOSE_MATCH_FLAG = (kind: string): FieldFlag => ({
  confidence: "low",
  reason: `found via text pattern match, not a ${kind}: link — verify it's real`,
});

const CROSS_DOMAIN_FLAG: FieldFlag = {
  confidence: "medium",
  reason: "email domain differs from site domain — verify this is the right contact",
};

// A real mailto: link is a genuine structural signal, but "genuinely on this page" isn't
// the same question as "the right contact for this business" — confirmed live on
// CLaaS2SaaS, whose site's mailto: link resolves to a completely different company's
// domain (a sub-brand/parent-company relationship, most likely, but that's exactly the
// kind of thing a reviewer should confirm, not something this flag can know on its own).
function domainsMatch(email: string, siteUrl: string): boolean {
  const emailDomain = email.split("@")[1]?.toLowerCase().replace(/^www\./, "");
  if (!emailDomain) return true; // malformed email — not this check's problem to flag

  let siteDomain: string;
  try {
    siteDomain = new URL(siteUrl).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return true; // can't parse the site URL — don't flag on a check we can't actually run
  }

  return (
    emailDomain === siteDomain ||
    emailDomain.endsWith(`.${siteDomain}`) ||
    siteDomain.endsWith(`.${emailDomain}`)
  );
}

// A "share this page" widget (common on WordPress themes) produces an href like
// "mailto:?&subject=...&body=..." — technically a mailto: link, but with nothing before
// the "?": there's no actual recipient address, just pre-filled subject/body for whatever
// email client opens it. Confirmed live: Princeton Dental's homepage has exactly this
// widget, and since it's crawled before the real "mailto:admin@princetondental.com.au"
// link on the contact page, naively taking "the first mailto: link found" produced a
// confidently-empty result instead of falling through to find the real one.
function mailtoAddress(href: string): string | null {
  const raw = decodeURIComponent(href.slice("mailto:".length).split("?")[0]).trim();
  return raw.length > 0 ? raw : null;
}

function telNumber(href: string): string | null {
  const raw = decodeURIComponent(href.slice("tel:".length)).trim();
  return raw.length > 0 ? raw : null;
}

function findEmailInText(pageText: string): { value: string; flag: FieldFlag } | null {
  const match = pageText.match(EMAIL_TEXT_REGEX);
  if (!match) return null;
  return { value: match[0], flag: LOOSE_MATCH_FLAG("mailto") };
}

function findPhoneInText(pageText: string): { value: string; flag: FieldFlag } | null {
  const match = pageText.match(PHONE_TEXT_REGEX);
  if (!match) return null;
  return { value: match[0].trim(), flag: LOOSE_MATCH_FLAG("tel") };
}

// Deterministic, no AI — a mailto:/tel: anchor href is a structural signal (the site
// itself marked this as its contact info), so it's treated as high confidence (no flag);
// a bare regex match in page text could be a customer's email in a testimonial or an
// unrelated number, so it's flagged for review. Address is deliberately not attempted
// here — a free-text street address isn't reliably regex-able — and is left to the one
// Claude call.
export function extractContactDetails(pageLinks: string[], pageText: string, siteUrl: string): ContactExtraction {
  // .map+.find rather than a plain .find on href.startsWith(...) — a mailto:/tel: link
  // with no real address after it (a "share this page" widget, see mailtoAddress above)
  // must be skipped in favor of the next candidate, not mistaken for "found, done."
  const mailtoAddressFound = pageLinks
    .filter((href) => href.toLowerCase().startsWith("mailto:"))
    .map(mailtoAddress)
    .find((addr): addr is string => addr !== null);
  const telNumberFound = pageLinks
    .filter((href) => href.toLowerCase().startsWith("tel:"))
    .map(telNumber)
    .find((num): num is string => num !== null);

  let email: string | null;
  let emailFlag: FieldFlag | null;
  if (mailtoAddressFound) {
    email = mailtoAddressFound;
    emailFlag = null;
  } else {
    const found = findEmailInText(pageText);
    email = found?.value ?? null;
    emailFlag = found?.flag ?? null;
  }

  // Cross-domain check applies regardless of how the email was found (mailto: link or
  // text match) — a domain mismatch is worth flagging even when the extraction itself was
  // high-confidence, since "confidently extracted" and "confidently the right contact"
  // are different questions.
  if (email && !domainsMatch(email, siteUrl)) {
    emailFlag = CROSS_DOMAIN_FLAG;
  }

  let phone: string | null;
  let phoneFlag: FieldFlag | null;
  if (telNumberFound) {
    phone = telNumberFound;
    phoneFlag = null;
  } else {
    const found = findPhoneInText(pageText);
    phone = found?.value ?? null;
    phoneFlag = found?.flag ?? null;
  }

  return { email, emailFlag, phone, phoneFlag };
}
