import Image from "next/image";
import MfaForm from "./mfa-form";

// Without this, the page has no dynamic server API calls, so Next classifies it as
// static and caches the client-side router entry for ~5 minutes. Navigating here via
// router.push (login -> middleware redirect -> /mfa) then reuses that cached entry on a
// later visit instead of mounting a fresh MfaForm instance, so its mount-time effect
// never reruns and it's stuck wherever it was left (typically "Loading…"). Forcing
// dynamic puts this route in Next's zero-staleTime bucket, so every navigation here
// gets a real, fresh mount.
export const dynamic = "force-dynamic";

export default function MfaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/kondo-logo.png" alt="Kondo" width={276} height={45} className="mb-2 h-6 w-auto" priority />
          <p className="text-sm text-neutral-400">Internal facelift tool — JRNY Digital</p>
        </div>
        <MfaForm />
      </div>
    </div>
  );
}
