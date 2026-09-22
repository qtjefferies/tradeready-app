import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { deleteQuote, getQuote, updateQuote } from "@/lib/store";
import { badRequest, parseQuote, readJson } from "@/lib/validate";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** GET /api/quotes/[id] */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid quote id.");

  try {
    const quote = await getQuote(auth.user.id, id);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }
    return NextResponse.json({ quote });
  } catch (err) {
    console.error("[quotes/:id] get failed:", err);
    return NextResponse.json(
      { error: "Couldn't load the quote right now." },
      { status: 500 }
    );
  }
}

/** PUT /api/quotes/[id] */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid quote id.");

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseQuote(body, true);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const quote = await updateQuote(auth.user.id, id, parsed.value);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }
    return NextResponse.json({ quote });
  } catch (err) {
    console.error("[quotes/:id] update failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the quote right now." },
      { status: 500 }
    );
  }
}

/** DELETE /api/quotes/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid quote id.");

  try {
    const ok = await deleteQuote(auth.user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quotes/:id] delete failed:", err);
    return NextResponse.json(
      { error: "Couldn't delete the quote right now." },
      { status: 500 }
    );
  }
}
