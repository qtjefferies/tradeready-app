import { NextResponse } from "next/server";
import { activeDriver, isDatabaseConfigured, sql } from "@/lib/db";
import { aiConfigured } from "@/lib/ai";

/**
 * GET /api/health — liveness probe.
 *
 * Reports which backends are configured, and actually RUNS a query rather
 * than just checking that a connection string exists. The previous version
 * said "connected" whenever `POSTGRES_URL` was set, which is exactly the
 * case that can't be trusted: a URL pointing at the wrong host, the wrong
 * driver, or a database with no schema all look identical until something
 * tries to read from it.
 *
 * Never returns secrets, hostnames, or row counts — only whether it worked,
 * and if not, why, in terms the person deploying can act on.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const driver = activeDriver();
  let database = "not_configured";
  let detail: string | undefined;

  if (isDatabaseConfigured()) {
    try {
      // Cheapest possible round trip that proves the wire actually works.
      await sql`SELECT 1`;
      database = "connected";

      // A reachable database with no schema is the other silent failure —
      // the app would look fine until the first signup.
      try {
        await sql`SELECT 1 FROM users LIMIT 1`;
      } catch {
        database = "no_schema";
        detail = "Connected, but the tables are missing. Run lib/schema.sql against this database.";
      }
    } catch (err) {
      database = "unreachable";
      detail =
        err instanceof Error
          ? `Could not query: ${err.message.slice(0, 160)}`
          : "Could not query the database.";
    }
  } else {
    detail = "POSTGRES_URL is not set on this deployment.";
  }

  return NextResponse.json({
    ok: database === "connected",
    database,
    driver,
    ai: aiConfigured() ? "configured" : "not_configured",
    ...(detail ? { detail } : {}),
  });
}
