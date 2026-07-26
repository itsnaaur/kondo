"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError("Incorrect email or password");
      return;
    }

    router.push(searchParams.get("next") || "/");
    router.refresh();
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
        <input
          type="email"
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
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
