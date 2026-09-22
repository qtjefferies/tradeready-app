import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  assistQuoteLineItems,
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
 * POST /api/ai/assist-quote — describe the job in plain words, get draft
 * line items back (labor vs materials split, realistic pricing).
 * Body: { description: string, trade?: string }
 *
 * Every call here costs money at the AI provider, and an account is free to
 * create — so without a cap, one signup with a loop is an open tap on the
 * bill. The per-account limit is far above real use and only bites automation.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const limit = await rateLimit(`ai:assist-quote:${auth.user.id}`, 40, 3600);
  if (!limit.allowed) {
    return tooManyRequests(
      limit,
      "You've hit the hourly limit for AI drafting. Try again shortly."
    );
  }
  if (!aiConfigured()) return aiNotConfigured();

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { description?: unknown; trade?: unknown };
  const description =
    typeof b.description === "string" ? b.description.trim() : "";
  const trade =
    typeof b.trade === "string" && b.trade.trim()
      ? b.trade.trim().slice(0, 80)
      : auth.user.trade;

  if (description.length < 10) {
    return badRequest("Describe the job in a sentence or two first.");
  }
  if (description.length > 4000) {
    return badRequest("Description is too long — keep it under a few paragraphs.");
  }

  try {
    const result = await assistQuoteLineItems(description, trade);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[ai/assist-quote] failed:", err);
    return aiErrorResponse(err);
  }
}
