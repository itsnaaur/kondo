"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logLoginEvent } from "@/lib/actions/auth";
import { isAllowedEmail } from "@/lib/auth/domain";

// Maps the middleware's ?error= query param (lib/supabase/middleware.ts) to a message
// a person actually understands. This is a fallback for sessions that reach the domain
// check some other way (a stale cookie, a session established outside this form) — the
// form's own submit flow below checks the domain itself and never triggers this
// redirect at all. Read directly from searchParams on every render, not seeded into
// useState at mount: this route can be reached via a client-side redirect that reuses
// this same component instance rather than remounting it, so a value captured once at
// mount would go stale exactly when it matters (the first fix here didn't render this
// message until a hard refresh).
const ERROR_MESSAGES: Record<string, string> = {
  unauthorized_domain: "That account isn't on an approved company domain — sign in with your @jrnydigital.com.au account.",
};

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectErrorCode = searchParams.get("error");
  const displayError =
    error ?? (redirectErrorCode ? (ERROR_MESSAGES[redirectErrorCode] ?? "Sign-in failed — try again.") : null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setSubmitting(false);
      setError("Incorrect email or password");
      return;
    }

    // Checked here, client-side, before ever navigating — the alternative (letting the
    // middleware catch it after redirecting to "/") round-trips through a URL param,
    // which doesn't just delay the message (see ERROR_MESSAGES above) but also wipes
    // the email/password fields on the bounce back. Checking in place keeps the form
    // intact and shows the message immediately.
    if (!isAllowedEmail(data.user?.email)) {
      // Recorded before signOut(), which invalidates the session logLoginEvent() reads
      // to identify who this was — a rejected-domain attempt is exactly the kind of
      // event the audit trail exists to catch.
      await logLoginEvent().catch(() => {});
      await supabase.auth.signOut();
      setSubmitting(false);
      setError(
        "That account isn't on an approved company domain — sign in with your @jrnydigital.com.au account."
      );
      return;
    }

    // Best-effort — a logging failure should never block a successful sign-in.
    await logLoginEvent().catch(() => {});

    setSubmitting(false);
    // A hard navigation, not router.push()/refresh() — see the identical fix (and the
    // full explanation) in app/mfa/mfa-form.tsx's handleVerify. The auth-cookie write
    // after a Supabase auth mutation isn't guaranteed to have flushed by the time this
    // line runs, and Next's client router can race ahead of it. This route happened to
    // get away with router.push()+refresh() in testing, but there's no guarantee that
    // holds for every session state, so it uses the same reliable fix as MFA.
    window.location.href = searchParams.get("next") || "/";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-8 shadow-xl"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/kondo-logo.png" alt="Kondo" width={276} height={45} className="mb-2 h-6 w-auto" priority />
          <p className="text-sm text-neutral-400">Internal facelift tool — JRNY Digital</p>
        </div>
        {/* Visually the placeholder is label enough — sighted users see "Email"/"Password"
            the instant the field is empty — but a placeholder alone gives a screen reader
            no persistent accessible name once the field has a value, and doesn't survive
            autofill highlighting the same way a real label does. sr-only keeps the visual
            design exactly as-is. */}
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
        {displayError && <p className="mb-3 text-sm text-red-400">{displayError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-yellow-400 px-3 py-2 font-medium text-neutral-900 transition hover:bg-yellow-300 disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
