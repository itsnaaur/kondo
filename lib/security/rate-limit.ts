// Rate limiting and spend control. The main abuse risk for this app is cost, not data
// theft — a loop that triggers Call 1 a thousand times is a large Anthropic invoice, not
// a breach. Backed by Upstash Redis (works well from Vercel's serverless functions,
// unlike an in-memory counter which resets per cold start and isn't shared across
// instances).
//
// Fails OPEN if Upstash isn't configured — every limiter check below returns "allowed"
// with a console.warn rather than throwing, so the app remains usable before Upstash is
// set up. This means rate limiting is NOT actually active until UPSTASH_REDIS_REST_URL
// and UPSTASH_REDIS_REST_TOKEN are set — that's a real gap, not a hidden one; it's
// flagged in the pre-launch checklist as something to verify before inviting anyone.
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis) {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting and the daily " +
      "spend ceiling are disabled. Set them before inviting anyone beyond the core team."
  );
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

function makeLimiter(tokens: number, window: `${number} ${"s" | "m" | "h" | "d"}`, prefix: string) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix: `kondo:ratelimit:${prefix}`,
  });
}

// Suggested starting points from the security review — revisit once real usage patterns
// are known.
const generationHourly = makeLimiter(10, "1 h", "generation-hourly");
const generationDaily = makeLimiter(30, "1 d", "generation-daily");
const crawlHourly = makeLimiter(20, "1 h", "crawl-hourly");

async function check(limiter: Ratelimit | null, identifier: string): Promise<RateLimitResult> {
  if (!limiter) return { allowed: true };
  const result = await limiter.limit(identifier);
  if (result.success) return { allowed: true };
  return { allowed: false, retryAfterSeconds: Math.ceil((result.reset - Date.now()) / 1000) };
}

export async function checkGenerationRateLimit(userId: string): Promise<RateLimitResult> {
  const hourly = await check(generationHourly, userId);
  if (!hourly.allowed) return hourly;
  return check(generationDaily, userId);
}

export async function checkCrawlRateLimit(userId: string): Promise<RateLimitResult> {
  return check(crawlHourly, userId);
}

// A hard-stop counter, deliberately separate from the per-user limiters above — those
// prevent one user from flooding the queue, this prevents the aggregate across every
// user from producing a runaway bill. Counts jobs enqueued today across everyone.
const DAILY_JOB_CEILING = 200;

export async function checkGlobalDailySpendCeiling(): Promise<RateLimitResult> {
  if (!redis) return { allowed: true };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const key = `kondo:ratelimit:global-daily-jobs:${today}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // First increment of the day — set the key to expire so it doesn't accumulate keys
    // forever. 2 days of headroom in case of clock skew between app and Redis.
    await redis.expire(key, 60 * 60 * 48);
  }

  if (count > DAILY_JOB_CEILING) {
    // Not a real per-user retry-after — this is a global ceiling, so "when does it
    // reset" is "tomorrow." Reported as the seconds remaining until UTC midnight.
    const now = new Date();
    const midnightUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
    return { allowed: false, retryAfterSeconds: Math.ceil((midnightUtc - now.getTime()) / 1000) };
  }

  return { allowed: true };
}

// Per-user concurrency cap — checked against the Job table directly (not Redis), since
// "how many jobs does this user currently have in flight" is naturally a database
// question, not a sliding-window rate question.
export const MAX_CONCURRENT_JOBS_PER_USER = 2;
