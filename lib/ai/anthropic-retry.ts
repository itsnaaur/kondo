import Anthropic from "@anthropic-ai/sdk";

// Every Anthropic call site in the generation pipeline (design-direction.ts,
// visual-read.ts, brief-synthesis.ts, build-page.ts, generate.ts) wraps its call in a
// small retry loop — but that loop exists to recover from a malformed/incomplete tool
// call, which is the model's fault and benefits from an immediate retry with the
// rejection reason fed back in. A transient failure (Anthropic overloaded, rate
// limited, a 5xx) is a completely different kind of failure: it has nothing to do with
// what the model produced, and hammering it three times inside the same second (no
// backoff) is one attempt with extra steps, not three independent chances. Confirmed
// live: a single "Overloaded" burned all 3 of design-direction.ts's validation-retry
// attempts in under two seconds, leaving zero budget for an actual schema failure to
// get a fair shake.
//
// The fix: classify the error, and only let genuine validation failures consume the
// caller's own MAX_ATTEMPTS budget. Transient errors are retried here, with backoff,
// invisibly to that budget.

const TRANSIENT_ERROR_TYPES = new Set(["overloaded_error", "rate_limit_error", "timeout_error", "api_error"]);

export function isTransientAnthropicError(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.InternalServerError) return true;
  if (err instanceof Anthropic.APIError) {
    if (typeof err.status === "number" && (err.status === 429 || err.status >= 500)) return true;
    if (err.type && TRANSIENT_ERROR_TYPES.has(err.type)) return true;
  }
  return false;
}

const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 20_000;
const MAX_TRANSIENT_RETRIES = 5;

function jitteredBackoffMs(attempt: number): number {
  const exponential = BASE_DELAY_MS * 2 ** (attempt - 1);
  const capped = Math.min(exponential, MAX_DELAY_MS);
  return capped * (0.5 + Math.random() * 0.5); // full jitter within [50%, 100%] of the capped delay
}

// Wraps one logical Anthropic call. Transient errors are retried here with exponential
// backoff and jitter, up to MAX_TRANSIENT_RETRIES times, and never reach the caller —
// its own MAX_ATTEMPTS loop only ever sees a real (non-transient) failure, or success.
export async function withTransientRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_TRANSIENT_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransientAnthropicError(err)) throw err;
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === MAX_TRANSIENT_RETRIES) break;
      const delayMs = jitteredBackoffMs(attempt);
      console.error(
        `[anthropic-retry] ${label}: transient error (attempt ${attempt}/${MAX_TRANSIENT_RETRIES}), retrying in ${Math.round(delayMs)}ms: ${message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label}: Anthropic call failed after transient retries`);
}
