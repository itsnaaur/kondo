import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "./domain";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class MfaRequiredError extends Error {
  constructor(message = "MFA required") {
    super(message);
    this.name = "MfaRequiredError";
  }
}

// Every server action and API route calls this first, independent of proxy.ts. The doc
// this is implementing is explicit that middleware alone isn't sufficient — server
// actions in particular are directly invocable POST endpoints, and a route handler
// that only trusts "middleware already ran" has no defense if that assumption is ever
// wrong (a matcher edited without noticing a gap, a route added that a future refactor
// moves outside the matched paths). This also re-asserts the email domain independently
// of the Supabase hook and the proxy-level check, per the doc's three-layer requirement
// — catches a misconfigured hook, an undocumented dashboard change, or a user row
// created directly in the database during debugging.
//
// getUser() specifically, never getSession() — getSession() reads the cookie without
// validating it against the auth server, which is not a trustworthy check server-side.
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedEmail(user.email)) {
    throw new UnauthorizedError();
  }

  // MFA is mandatory (a password-only internal tool holding client data is one
  // credential-stuffing hit from an incident) — enforced by requiring step-up to AAL2
  // here, not just by the middleware redirect to /mfa, for the same defense-in-depth
  // reason every other check in this function is duplicated at the action/route level.
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    throw new MfaRequiredError();
  }

  return user;
}

// Shared by every API route handler's catch block — maps the auth errors requireUser()
// can throw to the right HTTP response, or returns null if the error is something else
// the caller should rethrow.
export function authErrorResponse(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof MfaRequiredError) {
    return Response.json({ error: "MFA setup required" }, { status: 401 });
  }
  return null;
}
