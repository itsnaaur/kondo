-- Layer 2 of the three-layer domain restriction (see lib/auth/domain.ts for layer 3,
-- and README/SECURITY notes for layer 1 — disabling self-signup in the Supabase
-- dashboard). This is the "Before User Created" Auth Hook pattern Supabase documents
-- for exactly this use case: it runs before a row is inserted into auth.users and can
-- reject the signup outright, so it fires for email/password, magic link, and any OAuth
-- provider added later — not just the current sign-in form.
--
-- A table (not a hardcoded domain string) so adding a contractor's domain later is a
-- row insert, not a migration.
--
-- IMPORTANT — this table/function is not enough on its own. After this migration runs,
-- someone with Supabase dashboard access must still wire it up at:
--   Dashboard -> Authentication -> Hooks -> Before User Created
-- and select this function. Test it by attempting signup with a non-company email
-- (e.g. a gmail.com address) and confirming it's rejected. Auth Hook event/response
-- shapes are Supabase-versioned — verify this function's shape against the current
-- Supabase dashboard's own hook documentation/example before relying on it, since this
-- was written from the documented pattern without a live test against your project.

CREATE TABLE IF NOT EXISTS public.signup_email_domains (
    domain TEXT PRIMARY KEY
);

INSERT INTO public.signup_email_domains (domain)
VALUES ('jrnydigital.com.au')
ON CONFLICT (domain) DO NOTHING;

CREATE OR REPLACE FUNCTION public.hook_restrict_signup_by_email_domain(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_email TEXT;
  email_domain TEXT;
  is_allowed BOOLEAN;
BEGIN
  user_email := event->'user'->>'email';

  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Signup rejected: no email on the incoming user.'
      )
    );
  END IF;

  email_domain := split_part(user_email, '@', 2);

  SELECT EXISTS(
    SELECT 1 FROM public.signup_email_domains WHERE domain = lower(email_domain)
  ) INTO is_allowed;

  IF NOT is_allowed THEN
    RETURN jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Signups are restricted to approved company domains.'
      )
    );
  END IF;

  RETURN jsonb_build_object();
END;
$$;

-- Only Supabase's own auth admin role should be able to invoke this — it must not be
-- callable by normal authenticated/anon requests.
GRANT EXECUTE ON FUNCTION public.hook_restrict_signup_by_email_domain TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.hook_restrict_signup_by_email_domain FROM authenticated, anon, public;
