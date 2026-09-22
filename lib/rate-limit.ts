import { isDatabaseConfigured, sql } from "./db";

/**
 * Fixed-window rate limiting, stored in Postgres.
 *
 * Serverless instances don't share memory, so an in-process counter is close
 * to decorative — the next request may land somewhere that has never heard of
 * it. The database is the only thing every instance already agrees on, and
 * these endpoints are low-frequency enough that a round trip is cheap.
 *
 * FAILS OPEN. If the limiter itself errors, the request is allowed and the
 * failure is logged. A broken limiter taking down sign-in for everyone would
 * be a worse outage than the abuse it's guarding against — and the expensive
 * paths have a second line of defence anyway (bcrypt cost 12 on login, an
 * account requirement on the AI routes).
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets. 0 when allowed. */
  retryAfter: number;
}

const ALLOWED: RateLimitResult = { allowed: true, retryAfter: 0 };

export async function rateLimit(
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (!isDatabaseConfigured()) return ALLOWED;

  try {
    // One statement, so two simultaneous requests can't both read a stale
    // count. The CASE resets the window in the same write that increments it.
    const r = await sql`
      INSERT INTO rate_limits (bucket, count, window_start)
      VALUES (${bucket}, 1, NOW())
      ON CONFLICT (bucket) DO UPDATE SET
        count = CASE
          WHEN rate_limits.window_start < NOW() - (${windowSeconds} || ' seconds')::interval
          THEN 1 ELSE rate_limits.count + 1 END,
        window_start = CASE
          WHEN rate_limits.window_start < NOW() - (${windowSeconds} || ' seconds')::interval
          THEN NOW() ELSE rate_limits.window_start END
      RETURNING count, EXTRACT(EPOCH FROM (window_start + (${windowSeconds} || ' seconds')::interval - NOW()))::int AS reset_in
    `;
    const row = r.rows[0] as { count: number; reset_in: number } | undefined;
    if (!row) return ALLOWED;

    // Opportunistic cleanup: rows older than a day are long dead.
    if (Math.random() < 0.01) {
      sql`DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 day'`.catch(
        () => {}
      );
    }

    if (row.count > limit) {
      return { allowed: false, retryAfter: Math.max(1, row.reset_in) };
    }
    return ALLOWED;
  } catch (err) {
    console.error("[rate-limit] check failed, allowing request:", err);
    return ALLOWED;
  }
}

/**
 * The caller's IP as Vercel reports it. `x-forwarded-for` is a comma-separated
 * chain and the client is the first entry; the rest are proxies. Falls back to
 * a shared bucket so a missing header can't be used to opt out of limiting.
 */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** 429 with a Retry-After header, which well-behaved clients honour. */
export function tooManyRequests(result: RateLimitResult, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(result.retryAfter),
    },
  });
}
