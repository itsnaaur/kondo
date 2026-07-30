"use server";

import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/domain";
import { logAuditEvent } from "@/lib/audit-log";

// Called from the login form right after a successful client-side sign-in — i.e.
// immediately after password verification, before any MFA step-up. The session is
// always AAL1 at this exact moment, so this deliberately does NOT use requireUser():
// its AAL2 check would throw here every single time, which is exactly the bug that
// meant no login was ever recorded. It also doesn't gate on domain — a non-company
// email that successfully authenticates against Supabase is precisely the event an
// audit trail exists to catch, so this logs regardless of domain validity and never
// throws on the rejection path.
export async function logLoginEvent(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const allowed = isAllowedEmail(user.email);
  await logAuditEvent("LOGIN", {
    userId: user.id,
    metadata: allowed ? undefined : { rejectedDomain: true, email: user.email },
  });
}
