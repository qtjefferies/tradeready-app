import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createCustomer, listCustomers } from "@/lib/store";
import { badRequest, parseCustomer, readJson } from "@/lib/validate";

/** GET /api/customers — list the user's customers. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const customers = await listCustomers(auth.user.id);
    return NextResponse.json({ customers });
  } catch (err) {
    console.error("[customers] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your customers right now." },
      { status: 500 }
    );
  }
}

/** POST /api/customers — add a customer. */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseCustomer(body);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const customer = await createCustomer(auth.user.id, parsed.value);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    console.error("[customers] create failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the customer right now." },
      { status: 500 }
    );
  }
}
