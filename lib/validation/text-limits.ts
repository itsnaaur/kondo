import { z } from "zod";

// Simple length caps on free-text form fields — not because any of these are parsed
// into a structured shape (they're plain strings the UI already treats as opaque text),
// but because nothing currently stops a client name or brief text from being an
// arbitrarily large payload that gets stored and then sent to the Anthropic API on
// every generation. Generous limits; the point is bounding the pathological case, not
// constraining normal use.
export const clientNameSchema = z.string().trim().min(1).max(200);
export const siteUrlInputSchema = z.string().trim().min(1).max(2000);

// Review Extraction form fields (lib/actions/content.ts, ContentReviewForm) — generic
// length caps reused across similarly-shaped fields rather than one schema per exact
// field name.
export const shortTextSchema = z.string().trim().max(200); // names, authors, roles
export const mediumTextSchema = z.string().trim().max(2_000); // service/testimonial descriptions and quotes
export const longTextSchema = z.string().trim().max(20_000); // aboutCopy
export const contactFieldSchema = z.string().trim().max(300); // email/phone/address
export const hexColorSchema = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/);
