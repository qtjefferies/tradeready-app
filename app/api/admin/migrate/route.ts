import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { timingSafeEqual } from "crypto";
import { isDatabaseConfigured, sql } from "@/lib/db";

/**
 * POST /api/admin/migrate — apply lib/schema.sql to the connected database.
 *
 * WHY THIS EXISTS: a Marketplace-provisioned database hands its connection
 * string to the deployment and to nobody else — Vercel redacts it on pull —
 * so there is no way to run psql against it from a laptop. The schema has to
 * be applied from inside something that already holds the credential.
 *
 * HOW IT IS CONTAINED:
 *  - The route does not exist unless MIGRATE_TOKEN is set. No token, 404 —
 *    not 401, so its existence isn't advertised either.
 *  - The token is compared in constant time.
 *  - It runs ONE fixed file that ships with the app. There is no parameter
 *    that can carry SQL; this is not a query endpoint.
 *  - schema.sql is idempotent (every statement is IF NOT EXISTS), so a
 *    replay is a no-op rather than a destructive event.
 *
 * Unset MIGRATE_TOKEN once the tables exist and this disappears again.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const expected = process.env.MIGRATE_TOKEN;
  if (!expected) {
    return new NextResponse("Not found", { status: 404 });
  }

  const provided =
    req.headers.get("x-migrate-token") ??
    req.nextUrl.searchParams.get("token") ??
    "";
  if (!provided || !tokenMatches(provided, expected)) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "No database is connected to this deployment." },
      { status: 503 }
    );
  }

  try {
    const file = path.join(process.cwd(), "lib", "schema.sql");
    const text = await readFile(file, "utf8");

    /**
     * Split on semicolons that end a line. The schema is plain DDL with no
     * functions or dollar-quoted bodies, so this is sufficient — and it has
     * to be split at all because the driver sends one statement per call.
     */
    const statements = text
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^--/.test(s.replace(/\n/g, " ").trim()));

    let applied = 0;
    const failures: string[] = [];
    for (const statement of statements) {
      try {
        // Not a template interpolation — this is the bundled file's own text,
        // and it carries no user input of any kind.
        await sql([statement] as unknown as TemplateStringsArray);
        applied++;
      } catch (err) {
        failures.push(
          `${statement.slice(0, 60).replace(/\s+/g, " ")}… — ${
            err instanceof Error ? err.message.slice(0, 120) : "failed"
          }`
        );
      }
    }

    const tables = await sql`
      SELECT COUNT(*)::int AS n FROM information_schema.tables
      WHERE table_schema = 'public'
    `;

    return NextResponse.json({
      ok: failures.length === 0,
      applied,
      tables: (tables.rows[0] as { n: number }).n,
      ...(failures.length ? { failures: failures.slice(0, 10) } : {}),
    });
  } catch (err) {
    console.error("[admin/migrate] failed:", err);
    return NextResponse.json(
      {
        error: "Migration failed.",
        detail: err instanceof Error ? err.message.slice(0, 200) : undefined,
      },
      { status: 500 }
    );
  }
}
