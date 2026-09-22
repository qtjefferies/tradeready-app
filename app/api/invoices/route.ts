import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createInvoice, getQuote, listInvoices } from "@/lib/store";
import { badRequest, parseInvoice, readJson } from "@/lib/validate";
import type { InvoiceStatus } from "@/lib/store";

const STATUSES: InvoiceStatus[] = ["draft", "unpaid", "sent", "overdue", "paid"];

/** GET /api/invoices[?status=] */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = STATUSES.includes(statusParam as InvoiceStatus)
    ? (statusParam as InvoiceStatus)
    : undefined;

  try {
    const invoices = await listInvoices(auth.user.id, status);
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("[invoices] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your invoices right now." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices — create an invoice.
 * Pass { fromQuote: <quoteId> } to build it from an accepted quote in one click.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as Record<string, unknown>;

  // One-click: create from an accepted quote.
  const fromQuote = typeof b.fromQuote === "number" ? b.fromQuote : Number(b.fromQuote);
  if (Number.isInteger(fromQuote) && fromQuote > 0) {
    try {
      const quote = await getQuote(auth.user.id, fromQuote);
      if (!quote) {
        return NextResponse.json({ error: "Quote not found." }, { status: 404 });
      }
      const due =
        typeof b.due_at === "string" && b.due_at.trim()
          ? b.due_at.trim().slice(0, 30)
          : null;
      const invoice = await createInvoice(auth.user.id, {
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        quote_id: quote.id,
        title: quote.title,
        status: "unpaid",
        line_items: quote.line_items,
        tax_pct: quote.tax_pct,
        discount: quote.discount,
        notes: quote.notes,
        due_at: due,
      });
      return NextResponse.json({ invoice }, { status: 201 });
    } catch (err) {
      console.error("[invoices] create-from-quote failed:", err);
      return NextResponse.json(
        { error: "Couldn't create the invoice right now." },
        { status: 500 }
      );
    }
  }

  const parsed = parseInvoice(body);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const invoice = await createInvoice(auth.user.id, {
      customer_id: parsed.value.customer_id ?? null,
      customer_name: parsed.value.customer_name ?? "",
      quote_id: parsed.value.quote_id ?? null,
      title: parsed.value.title ?? "",
      status: parsed.value.status ?? "draft",
      line_items: parsed.value.line_items ?? [],
      tax_pct: parsed.value.tax_pct ?? 0,
      discount: parsed.value.discount ?? 0,
      notes: parsed.value.notes ?? "",
      due_at: parsed.value.due_at ?? null,
      paid_at: parsed.value.paid_at ?? null,
      sent_at: parsed.value.sent_at ?? null,
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    console.error("[invoices] create failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the invoice right now." },
      { status: 500 }
    );
  }
}
