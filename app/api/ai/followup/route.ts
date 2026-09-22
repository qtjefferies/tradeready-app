import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getQuote, logFollowup } from "@/lib/store";
import { computeTotals } from "@/lib/money";
import {
  draftFollowup,
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
 * POST /api/ai/followup — draft a follow-up nudge text for a stale quote.
 * Body: { quote_id: number }
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

  const limit = await rateLimit(`ai:followup:${auth.user.id}`, 60, 3600);
  if (!limit.allowed) {
    return tooManyRequests(
      limit,
      "You've hit the hourly limit for AI drafting. Try again shortly."
    );
  }
  if (!aiConfigured()) return aiNotConfigured();

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
    // Count the nudge. The win-rate screen can only answer "do follow-ups
    // actually win work?" if the follow-ups are on record.
    await logFollowup(auth.user.id, quoteId);
    return NextResponse.json({ message });
  } catch (err) {
    console.error("[ai/followup] failed:", err);
    return aiErrorResponse(err);
  }
}
