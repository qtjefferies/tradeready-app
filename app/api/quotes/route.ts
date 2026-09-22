import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createQuote, listQuotes } from "@/lib/store";
import { badRequest, parseQuote, readJson } from "@/lib/validate";
import type { QuoteStatus } from "@/lib/store";

const STATUSES: QuoteStatus[] = ["draft", "sent", "viewed", "accepted", "declined"];

/** GET /api/quotes[?status=] — list the user's quotes. */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = STATUSES.includes(statusParam as QuoteStatus)
    ? (statusParam as QuoteStatus)
    : undefined;

  try {
    const quotes = await listQuotes(auth.user.id, status);
    return NextResponse.json({ quotes });
  } catch (err) {
    console.error("[quotes] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your quotes right now." },
      { status: 500 }
    );
  }
}

/** POST /api/quotes — create a quote. */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseQuote(body);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const quote = await createQuote(auth.user.id, {
      customer_id: parsed.value.customer_id ?? null,
      customer_name: parsed.value.customer_name ?? "",
      title: parsed.value.title ?? "",
      trade: parsed.value.trade ?? auth.user.trade,
      status: parsed.value.status ?? "draft",
      line_items: parsed.value.line_items ?? [],
      tax_pct: parsed.value.tax_pct ?? 0,
      discount: parsed.value.discount ?? 0,
      notes: parsed.value.notes ?? "",
      valid_until: parsed.value.valid_until ?? null,
      sent_at: parsed.value.sent_at ?? null,
    });
    return NextResponse.json({ quote }, { status: 201 });
  } catch (err) {
    console.error("[quotes] create failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the quote right now." },
      { status: 500 }
    );
  }
}
