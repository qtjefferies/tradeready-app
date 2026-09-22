import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  assistQuoteLineItems,
  geminiConfigured,
  geminiErrorResponse,
  geminiNotConfigured,
} from "@/lib/gemini";
import { badRequest, readJson } from "@/lib/validate";

/**
 * POST /api/ai/assist-quote — describe the job in plain words, get draft
 * line items back (labor vs materials split, realistic pricing).
 * Body: { description: string, trade?: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!geminiConfigured()) return geminiNotConfigured();

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
    return geminiErrorResponse(err);
  }
}
