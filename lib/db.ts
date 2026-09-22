import { sql as vercelSql } from "@vercel/postgres";
import type { Pool, QueryResultRow } from "pg";

/**
 * Database availability and driver selection.
 *
 * `POSTGRES_URL` is set automatically when a database is connected to the
 * Vercel project. Until it exists, every query path returns an honest
 * "not configured" error — nothing is faked and nothing is silently dropped.
 */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

/**
 * WHICH DRIVER.
 *
 * `@vercel/postgres` is a wrapper around Neon's serverless driver: it talks
 * HTTP/WebSocket to a Neon endpoint, not the Postgres wire protocol. That
 * makes it fast on Vercel, and useless against anything that isn't Neon.
 *
 * Supabase, Railway, RDS, Fly and a local server are all ordinary Postgres
 * over TCP, so they get node-postgres instead. An earlier version of this
 * file switched on "is it localhost", which quietly assumed every hosted
 * database was Neon — pointing it at Supabase would have failed on the first
 * query after deploy, with an error that looks nothing like its cause.
 *
 * Both paths present the identical tagged-template API, so nothing above
 * this file knows or cares which one is in use.
 */
function isNeonHost(): boolean {
  const url = process.env.POSTGRES_URL;
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    // Neon's own domains, and the Vercel Postgres product that runs on it.
    return (
      hostname.endsWith(".neon.tech") ||
      hostname.endsWith(".vercel-storage.com")
    );
  } catch {
    return false;
  }
}

function isLocalHost(): boolean {
  const url = process.env.POSTGRES_URL;
  if (!url) return false;
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

/** Lazily-built singleton pool — Next.js reloads this module often in dev. */
const globalForPg = globalThis as typeof globalThis & { __tradeReadyPool?: Pool };

function pgPool(): Pool {
  if (!globalForPg.__tradeReadyPool) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool: PgPool } = require("pg") as typeof import("pg");
    const local = isLocalHost();
    globalForPg.__tradeReadyPool = new PgPool({
      connectionString: process.env.POSTGRES_URL,
      /**
       * Managed providers terminate TLS with certificates that aren't always
       * chainable from Node's default trust store, and a failure there reads
       * as a generic connection error. The connection is still encrypted;
       * it just isn't certificate-verified. If your provider's chain does
       * validate, tighten this to `ssl: true`.
       */
      ssl: local ? undefined : { rejectUnauthorized: false },
      /**
       * Serverless functions are many short-lived instances, each with its
       * own pool, so a large per-instance pool exhausts the database's
       * connection limit fast. Keep it small and let the provider's own
       * pooler (Supavisor, PgBouncer) do the real multiplexing — and use
       * the POOLED connection string it gives you, not the direct one.
       */
      max: local ? 10 : 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return globalForPg.__tradeReadyPool;
}

/**
 * Tagged template with the same shape as `@vercel/postgres`'s `sql`: each
 * interpolated value becomes a bound `$n` parameter, never string-
 * concatenated, so the SQL-injection guarantees are identical.
 */
function pgSql<T extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  const text = strings.reduce(
    (acc, part, i) => acc + part + (i < values.length ? `$${i + 1}` : ""),
    ""
  );
  return pgPool().query<T>(text, values as unknown[]);
}

/** Re-export for query modules. */
export const sql: typeof vercelSql = new Proxy(vercelSql, {
  apply(target, thisArg, args) {
    if (!isNeonHost()) {
      return pgSql(args[0] as TemplateStringsArray, ...args.slice(1));
    }
    return Reflect.apply(target, thisArg, args);
  },
}) as typeof vercelSql;

/**
 * Which driver is actually in play. Surfaced on /api/health so a deploy that
 * connects to the wrong kind of database is diagnosable from outside.
 */
export function activeDriver(): "neon-http" | "node-postgres" | "none" {
  if (!isDatabaseConfigured()) return "none";
  return isNeonHost() ? "neon-http" : "node-postgres";
}
