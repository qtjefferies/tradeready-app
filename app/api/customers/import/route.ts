import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { importCustomers } from "@/lib/store";
import { badRequest, readJson } from "@/lib/validate";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** A contacts export can be long, but not unbounded. */
const MAX_ROWS = 2000;

/**
 * POST /api/customers/import — bulk-add customers from an uploaded file.
 * Body: { customers: [{ name, phone, email, address }] }
 *
 * The file is parsed in the browser, so nothing but the extracted rows ever
 * reaches the server — a contacts export usually carries far more about a
 * person than this app has any business storing.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const limit = await rateLimit(`import:${auth.user.id}`, 10, 3600);
  if (!limit.allowed) {
    return tooManyRequests(limit, "That's a lot of imports. Try again later.");
  }

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { customers?: unknown };

  if (!Array.isArray(b.customers)) {
    return badRequest("No customers to import.");
  }
  if (b.customers.length === 0) {
    return badRequest("That file didn't have any rows we could read.");
  }
  if (b.customers.length > MAX_ROWS) {
    return badRequest(
      `That's ${b.customers.length} rows — more than we import at once. Split the file into ${MAX_ROWS}-row chunks.`
    );
  }

  const str = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const rows = b.customers
    .map((c) => {
      const o = (c ?? {}) as Record<string, unknown>;
      return {
        name: str(o.name, 200),
        phone: str(o.phone, 40),
        email: str(o.email, 254),
        address: str(o.address, 300),
      };
    })
    .filter((r) => r.name.length > 0);

  if (rows.length === 0) {
    return badRequest("None of those rows had a name we could use.");
  }

  try {
    const result = await importCustomers(auth.user.id, rows);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[customers/import] failed:", err);
    return NextResponse.json(
      { error: "Couldn't import those customers right now." },
      { status: 500 }
    );
  }
}
