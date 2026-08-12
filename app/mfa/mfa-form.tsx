"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resetAbandonedMfaEnrollment } from "@/lib/actions/mfa";

type Step = "loading" | "enroll" | "challenge" | "error";

// MFA is mandatory (see lib/auth/require-user.ts and lib/supabase/middleware.ts) —
// this page is where a session that's only reached AAL1 gets routed. Two cases:
// no verified TOTP factor yet -> enroll (show QR + secret, verify one code to confirm
// the app is correctly set up); already has a verified factor but this session hasn't
// stepped up yet -> challenge (just enter the next code).
export default function MfaForm() {
  const [step, setStep] = useState<Step>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against React StrictMode's intentional double-invoke of effects in dev,
  // which otherwise races two concurrent enroll() calls against each other — the second
  // fails with "a factor with this friendly name already exists" because the first one
  // hadn't been reflected back into this component's state yet when the second fired.
  // A ref (synchronous, set before any await) is what actually closes that race; the
  // `cancelled` flag below only helps after the first await point, which is too late.
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    let cancelled = false;

    async function init() {
      const supabase = createClient();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      if (listError) {
        setError(listError.message);
        setStep("error");
        return;
      }

      const verifiedTotp = data.totp.find((f) => f.status === "verified");
      if (verifiedTotp) {
        setFactorId(verifiedTotp.id);
        setStep("challenge");
        return;
      }

      // issuer is explicit here rather than left to Supabase's own fallback — without it,
      // the name an authenticator app (Microsoft/Google Authenticator, 1Password, etc.)
      // shows for this account is derived from project config, not the app's actual name,
      // and doesn't change on its own just because the app gets deployed somewhere else —
      // confirmed live: it was showing "localhost:3000" even in production.
      let { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Kondo",
      });
      if (cancelled) return;

      // A stale, unverified factor from a previously abandoned enrollment attempt
      // blocks a fresh one, and this client-side unenroll() call cannot remove it — it
      // requires AAL2, which is exactly what this user doesn't have yet (that's why
      // they're on this page). Confirmed live: the server action below, which deletes
      // directly rather than going through the AAL2-gated client API, is what actually
      // clears it. Without this, a user who ever closes the tab mid-setup would be
      // permanently locked out once MFA is mandatory.
      if (enrollError) {
        try {
          await resetAbandonedMfaEnrollment();
        } catch (resetErr) {
          if (cancelled) return;
          setError(resetErr instanceof Error ? resetErr.message : "Could not reset MFA enrollment.");
          setStep("error");
          return;
        }
        if (cancelled) return;
        ({ data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          issuer: "Kondo",
        }));
        if (cancelled) return;
      }

      if (enrollError || !enrollData) {
        setError(enrollError?.message ?? "Could not start MFA enrollment.");
        setStep("error");
        return;
      }

      setFactorId(enrollData.id);
      setQrCode(enrollData.totp.qr_code);
      setSecret(enrollData.totp.secret);
      setStep("enroll");
    }

    init();
    return () => {
      cancelled = true;
      // Reset alongside `cancelled`, not just it: this only matters for StrictMode's
      // same-tick mount->cleanup->mount dev simulation, where the second, real mount
      // needs the guard cleared to run init() at all. It's safe now that the page is
      // force-dynamic (see page.tsx) — every genuine navigation here gets a truly new
      // component instance with its own fresh ref, so this cleanup never has to
      // distinguish "StrictMode replay" from "cached instance coming back to life".
      hasStartedRef.current = false;
    };
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.trim(),
    });

    setSubmitting(false);

    if (verifyError) {
      setError("Incorrect code — check your authenticator app and try again.");
      setCode("");
      return;
    }

    // A hard navigation, not router.push()/refresh(): challengeAndVerify() writes the
    // upgraded AAL2 session to the auth cookie via an internal, asynchronous
    // onAuthStateChange listener — it isn't guaranteed to have flushed by the moment
    // this line runs. Next's client-side router transition can race ahead of that
    // write and ask middleware to evaluate "/" against the still-AAL1 cookie, which
    // redirects straight back to /mfa — visible in server logs as a repeating GET /mfa
    // loop with no visible progress. Reordering refresh()-then-push() (tried first)
    // didn't close the race, because neither call waits for the other to actually
    // complete before returning. A full page load always reads whatever the browser's
    // current cookie jar holds at that instant and is evaluated by middleware from
    // scratch with no client-router involvement at all — exactly why a manual browser
    // refresh reliably "fixed" it every time.
    window.location.href = "/";
  }

  if (step === "loading") {
    return <p className="text-sm text-neutral-400">Loading…</p>;
  }

  if (step === "error") {
    return <p className="text-sm text-red-400">{error ?? "Something went wrong loading MFA setup."}</p>;
  }

  return (
    <div className="w-full max-w-sm">
      {step === "enroll" && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-200">Set up two-factor authentication</h2>
          <p className="mb-4 text-sm text-neutral-400">
            Scan this QR code with an authenticator app (1Password, Authy, Google Authenticator), then
            enter the 6-digit code it shows to finish setup.
          </p>
          {qrCode && (
            // Supabase returns a data: URI SVG for the QR code; next/image doesn't
            // handle data URIs well, and this is a one-time setup screen, not a
            // performance-sensitive path.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="Scan with your authenticator app" className="mb-3 rounded-lg bg-white p-2" />
          )}
          {secret && (
            <p className="mb-4 text-xs text-neutral-500">
              Can&apos;t scan? Enter this key manually: <span className="font-mono text-neutral-300">{secret}</span>
            </p>
          )}
        </div>
      )}

      {step === "challenge" && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-medium text-neutral-200">Enter your authenticator code</h2>
          <p className="mb-4 text-sm text-neutral-400">
            Open your authenticator app and enter the current 6-digit code.
          </p>
        </div>
      )}

      <form onSubmit={handleVerify}>
        <label htmlFor="mfa-code" className="sr-only">
          Authenticator code
        </label>
        <input
          id="mfa-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="123456"
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-center font-mono text-lg tracking-widest text-neutral-100 outline-none focus:border-neutral-500"
        />
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="w-full rounded-lg bg-yellow-400 px-3 py-2 font-medium text-neutral-900 transition hover:bg-yellow-300 disabled:opacity-60"
        >
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </form>
    </div>
  );
}
