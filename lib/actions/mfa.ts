"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/domain";
import { UnauthorizedError } from "@/lib/auth/require-user";

// Deliberately does NOT require AAL2 (unlike requireUser()) — this exists specifically
// to recover a user stuck at AAL1 with an abandoned, unverified TOTP factor from a
// previous incomplete enrollment. supabase.auth.mfa.unenroll() cannot remove that
// factor client-side without AAL2, which is exactly the level this user doesn't have —
// a catch-22 that would otherwise permanently lock them out once MFA is mandatory.
// Confirmed live: unenroll() on an unverified factor silently fails under an AAL1
// session, while a direct delete against auth.mfa_factors succeeds. Deletes only the
// calling user's own unverified factors, filtered by status != 'verified' in the query
// itself, so this can never be used to strip someone else's completed MFA or this
// user's own already-verified factor.
export async function resetAbandonedMfaEnrollment(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    throw new UnauthorizedError();
  }

  await prisma.$executeRaw`
    DELETE FROM auth.mfa_factors
    WHERE user_id = ${user.id}::uuid AND status != 'verified'
  `;
}
