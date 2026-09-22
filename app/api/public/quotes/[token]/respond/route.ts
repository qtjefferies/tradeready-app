import { NextRequest, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getQuoteByToken, respondToQuote, type QuoteResponse } from "@/lib/store";
import { badRequest, readJson } from "@/lib/validate";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/public/quotes/[token]/respond — the customer's answer.
 *
 * This is the only write path in the app that runs without a session. It is
 * safe because the token IS the authorization: 256 bits of randomness that
 * names exactly one quote and grants exactly two actions on it. There is no
 * enumeration to do and nothing else reachable from it.
 *
 * `respondToQuote` refuses a second answer and refuses to reopen a closed
 * quote, so a resubmitted form or a revisited link can't flip a decision the
 * contractor has already acted on.
 */

/** Base64url of 32 bytes is 43 chars. Reject anything else without a query. */
const TOKEN_LENGTH = 43;

const RESPONSES: QuoteResponse[] = ["accepted", "declined"];

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "This quote isn't available right now. Please contact the business directly." },
      { status: 503 }
    );
  }

  // The only unauthenticated write in the app. The token makes guessing
  // infeasible, but a cap keeps anyone from hammering the endpoint at all.
  const limit = await rateLimit(`respond:ip:${clientIp(req)}`, 30, 3600);
  if (!limit.allowed) {
    return tooManyRequests(limit, "Too many attempts. Please try again later.");
  }

  const token = params.token ?? "";
  if (token.length !== TOKEN_LENGTH) {
    return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  }

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { response?: unknown; reason?: unknown };

  const response = RESPONSES.includes(b.response as QuoteResponse)
    ? (b.response as QuoteResponse)
    : null;
  if (!response) return badRequest("Choose accept or decline.");

  const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 500) : "";

  try {
    const updated = await respondToQuote(token, response, reason);
    if (!updated) {
      // Either the link is dead, or the quote was already answered. Tell the
      // customer which, without leaking whether the token ever existed.
      const existing = await getQuoteByToken(token);
      if (existing) {
        return NextResponse.json(
          {
            error: "This quote has already been answered. Contact the business if you need to change it.",
            status: existing.quote.status,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error("[public/quotes/respond] failed:", err);
    return NextResponse.json(
      { error: "Couldn't record your answer. Please contact the business directly." },
      { status: 500 }
    );
  }
}
