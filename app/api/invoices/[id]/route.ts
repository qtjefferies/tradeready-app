import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { deleteInvoice, getInvoice, updateInvoice } from "@/lib/store";
import { badRequest, parseInvoice, readJson } from "@/lib/validate";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** GET /api/invoices/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid invoice id.");

  try {
    const invoice = await getInvoice(auth.user.id, id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (err) {
    console.error("[invoices/:id] get failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the invoice right now." },
      { status: 500 }
    );
  }
}

/** PUT /api/invoices/[id] */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid invoice id.");

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseInvoice(body, true);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const invoice = await updateInvoice(auth.user.id, id, parsed.value);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    return NextResponse.json({ invoice });
  } catch (err) {
    console.error("[invoices/:id] update failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the invoice right now." },
      { status: 500 }
    );
  }
}

/** DELETE /api/invoices/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid invoice id.");

  try {
    const ok = await deleteInvoice(auth.user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[invoices/:id] delete failed:", err);
    return NextResponse.json(
      { error: "Couldn't delete the invoice right now." },
      { status: 500 }
    );
  }
}
