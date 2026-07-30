// Shared by both lib/supabase/middleware.ts (Edge runtime) and lib/auth/require-user.ts
// (Node/server-action context) — kept dependency-free so it works in either.
export const ALLOWED_EMAIL_DOMAIN = "@jrnydigital.com.au";

// endsWith, never includes — includes("jrnydigital.com.au") would also accept
// attacker@jrnydigital.com.au.evil.com.
export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}
