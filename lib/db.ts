import { sql as vercelSql } from "@vercel/postgres";
import type { Pool, QueryResultRow } from "pg";

/**
 * Database availability and driver selection.
 *
 * Until a connection string exists, every query path returns an honest
 * "not configured" error — nothing is faked and nothing is silently dropped.
 *
 * WHERE THE CONNECTION STRING LIVES.
 *
 * Vercel Marketplace integrations namespace the variables they inject, so a
 * Supabase database connected through the dashboard arrives as
 * `STORAGE_POSTGRES_URL`, not `POSTGRES_URL`. Reading only the bare name
 * meant a database that was correctly connected still reported "not
 * configured", with nothing in the UI to suggest why.
 *
 * Checked in order of specificity: an explicitly-set POSTGRES_URL wins, then
 * the Marketplace-prefixed one, then the name most other hosts use.
 */
const URL_VARS = [
  "POSTGRES_URL",
  "STORAGE_POSTGRES_URL",
  "DATABASE_URL",
  "POSTGRES_URL_NON_POOLING",
  "STORAGE_POSTGRES_URL_NON_POOLING",
] as const;

export function databaseUrl(): string | undefined {
  for (const name of URL_VARS) {
    const v = process.env[name];
    // A variable that exists but is blank is the same as absent, and is a
    // common half-finished state in a dashboard.
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

/** Which variable supplied it — surfaced on /api/health for diagnosis. */
export function databaseUrlSource(): string | null {
  for (const name of URL_VARS) {
    const v = process.env[name];
    if (v && v.trim().length > 0) return name;
  }
  return null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(databaseUrl());
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
  const url = databaseUrl();
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
  const url = databaseUrl();
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

/**
 * node-postgres parses `sslmode` out of the connection string, and that
 * parsed value competes with the explicit `ssl` option below — which is how
 * a pool configured to skip verification still fails with "self-signed
 * certificate in certificate chain". Removing the parameter leaves exactly
 * one source of truth for TLS: the option.
 */
function connectionStringWithoutSslMode(): string | undefined {
  const raw = databaseUrl();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return raw;
  }
}

function pgPool(): Pool {
  if (!globalForPg.__tradeReadyPool) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool: PgPool } = require("pg") as typeof import("pg");
    const local = isLocalHost();
    globalForPg.__tradeReadyPool = new PgPool({
      connectionString: connectionStringWithoutSslMode(),
      /**
       * Supabase (and several other managed providers) terminate TLS with a
       * chain that doesn't validate against Node's default trust store, so
       * strict verification fails outright.
       *
       * TRADE-OFF, stated plainly: the connection is still encrypted, but the
       * server's identity is not verified, so this does not defend against an
       * attacker who can already intercept traffic between the function and
       * the database. Both sit inside provider networks, which is why this is
       * the common setting. To close it properly, download your provider's CA
       * certificate and pass `ssl: { ca }` instead.
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

/**
 * `@vercel/postgres` reads `process.env.POSTGRES_URL` directly and has no
 * way to be told otherwise, so when the value arrived under a different name
 * it is mirrored across before that driver is ever used.
 */
if (!process.env.POSTGRES_URL) {
  const resolved = databaseUrl();
  if (resolved) process.env.POSTGRES_URL = resolved;
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
