import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getQuote } from "@/lib/store";
import { computeTotals } from "@/lib/money";
import {
  draftFollowup,
  geminiConfigured,
  geminiErrorResponse,
  geminiNotConfigured,
} from "@/lib/gemini";
import { badRequest, readJson } from "@/lib/validate";

/**
 * POST /api/ai/followup — draft a follow-up nudge text for a stale quote.
 * Body: { quote_id: number }
 * The message is returned for the contractor to copy/send — nothing is
 * auto-sent anywhere.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!geminiConfigured()) return geminiNotConfigured();

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { quote_id?: unknown };
  const quoteId = typeof b.quote_id === "number" ? b.quote_id : Number(b.quote_id);
  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    return badRequest("A valid quote id is required.");
  }

  try {
    const quote = await getQuote(auth.user.id, quoteId);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }
    const totals = computeTotals(quote.line_items, quote.tax_pct, quote.discount);
    const daysStale = quote.sent_at
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(quote.sent_at).getTime()) / 86_400_000
          )
        )
      : 0;
    const message = await draftFollowup({
      businessName: auth.user.businessName || "us",
      customerName: quote.customer_name || "there",
      jobTitle: quote.title,
      total: totals.total,
      daysStale,
    });
    return NextResponse.json({ message });
  } catch (err) {
    console.error("[ai/followup] failed:", err);
    return geminiErrorResponse(err);
  }
}
