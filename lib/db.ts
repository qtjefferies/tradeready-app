import { sql as vercelSql } from "@vercel/postgres";
import type { Pool, QueryResultRow } from "pg";

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

/**
 * `@vercel/postgres` speaks Neon's HTTP protocol, which a plain Postgres
 * listening on a TCP socket cannot answer. So when `POSTGRES_URL` points at a
 * local server we swap in node-postgres, which speaks the wire protocol
 * directly. Hosted URLs (Neon, Vercel, Supabase, …) keep the original driver —
 * production behaviour is unchanged.
 */
function isLocalDatabase(): boolean {
  const url = process.env.POSTGRES_URL;
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

/** Lazily-built singleton pool — Next.js dev reloads this module often. */
const globalForPg = globalThis as typeof globalThis & { __tradeReadyPool?: Pool };

function localPool(): Pool {
  if (!globalForPg.__tradeReadyPool) {
    // Loaded lazily, and with require() rather than a static import, so `pg`
    // (a devDependency, for local development only) is never pulled into a
    // production bundle, where this branch is unreachable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool: PgPool } = require("pg") as typeof import("pg");
    globalForPg.__tradeReadyPool = new PgPool({ connectionString: process.env.POSTGRES_URL });
  }
  return globalForPg.__tradeReadyPool;
}

/**
 * Tagged template with the same shape as `@vercel/postgres`'s `sql`: each
 * interpolated value becomes a bound `$n` parameter, never string-concatenated,
 * so the SQL-injection guarantees are identical.
 */
function localSql<T extends QueryResultRow>(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce(
    (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
    "",
  );
  return localPool().query<T>(text, values as unknown[]);
}

/** Re-export for query modules. */
export const sql: typeof vercelSql = new Proxy(vercelSql, {
  apply(target, thisArg, args) {
    if (isLocalDatabase()) {
      return localSql(args[0] as TemplateStringsArray, ...args.slice(1));
    }
    return Reflect.apply(target, thisArg, args);
  },
}) as typeof vercelSql;
