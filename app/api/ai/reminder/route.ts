import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getInvoice } from "@/lib/store";
import { computeTotals } from "@/lib/money";
import {
  draftPaymentReminder,
  aiConfigured,
  aiErrorResponse,
  aiNotConfigured,
} from "@/lib/ai";
import { badRequest, readJson } from "@/lib/validate";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * A slow turn shouldn't hit the platform timeout, which returns an error page
 * instead of this route's honest JSON. The route finishes as soon as the model
 * answers; this is only the ceiling.
 */
export const maxDuration = 120;

/**
 * POST /api/ai/reminder — draft a payment reminder text for an overdue invoice.
 * Body: { invoice_id: number }
 * The message is returned for the contractor to copy/send — nothing is
 * auto-sent anywhere.
 *
 * Every call here costs money at the AI provider, and an account is free to
 * create — so without a cap, one signup with a loop is an open tap on the
 * bill. The per-account limit is far above real use and only bites automation.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const limit = await rateLimit(`ai:reminder:${auth.user.id}`, 60, 3600);
  if (!limit.allowed) {
    return tooManyRequests(
      limit,
      "You've hit the hourly limit for AI drafting. Try again shortly."
    );
  }
  if (!aiConfigured()) return aiNotConfigured();

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { invoice_id?: unknown };
  const invoiceId =
    typeof b.invoice_id === "number" ? b.invoice_id : Number(b.invoice_id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return badRequest("A valid invoice id is required.");
  }

  try {
    const invoice = await getInvoice(auth.user.id, invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    const totals = computeTotals(invoice.line_items, invoice.tax_pct, invoice.discount);
    const daysOverdue = invoice.due_at
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(invoice.due_at + "T12:00:00").getTime()) / 86_400_000
          )
        )
      : 0;
    const message = await draftPaymentReminder({
      businessName: auth.user.businessName || "us",
      customerName: invoice.customer_name || "there",
      invoiceTitle: `Invoice INV-${invoice.id} (${invoice.title})`,
      total: totals.total,
      daysOverdue,
    });
    return NextResponse.json({ message });
  } catch (err) {
    console.error("[ai/reminder] failed:", err);
    return aiErrorResponse(err);
  }
}
