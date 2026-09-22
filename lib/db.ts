import { sql } from "@vercel/postgres";

/**
 * Database availability.
 *
 * `POSTGRES_URL` is auto-injected as an env var when a Postgres database is
 * connected to the Vercel project. Until then, every query path returns an
 * honest "not configured" error — nothing is faked and nothing is silently
 * dropped.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

/** Re-export for query modules. */
export { sql };
