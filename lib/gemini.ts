import { NextResponse } from "next/server";
import type { LineItem } from "./money";
import { normalizeLineItems } from "./money";

/**
 * Shared Gemini helper for TradeReady AI features.
 *
 * Calls the Google Gemini API (free tier) server-side via fetch. The API key
 * NEVER leaves the server: it is read from GEMINI_API_KEY and sent only to
 * generativelanguage.googleapis.com.
 *
 * When the key is missing, callers get an honest 503 — the client shows that
 * message instead of a fabricated result.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
// NOTE: Free-tier models change over time. If Google retires this one, set
// GEMINI_MODEL in your env to a current free-tier Flash model.

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function geminiNotConfigured(): NextResponse {
  return NextResponse.json(
    {
      error: "AI not configured",
      detail:
        "The site owner hasn't added a GEMINI_API_KEY yet, so this feature can't run. No result was fabricated.",
    },
    { status: 503 }
  );
}

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

async function callGemini(
  systemPrompt: string,
  userText: string,
  maxOutputTokens = 1024,
  jsonMode = true
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY as string;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      MODEL
    )}:generateContent`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: jsonMode
          ? { responseMimeType: "application/json", maxOutputTokens }
          : { maxOutputTokens },
      }),
    }
  );

  if (!res.ok) {
    const detail = await res.text();
    console.error("[gemini] API error:", res.status, detail.slice(0, 500));
    if (res.status === 429) {
      throw Object.assign(new Error("AI rate limit reached, try again shortly."), {
        status: 429,
      });
    }
    throw Object.assign(
      new Error("The AI service returned an error. Please try again in a moment."),
      { status: 502 }
    );
  }

  const data = (await res.json()) as { candidates?: GeminiCandidate[] };
  const text = (data.candidates ?? [])
    .flatMap((c) => c.content?.parts ?? [])
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();

  if (!text) {
    throw Object.assign(
      new Error("The AI returned an empty response. Please try again."),
      { status: 502 }
    );
  }
  return text;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    const parsed: unknown = JSON.parse(cleaned);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

export function geminiErrorResponse(err: unknown): NextResponse {
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status: unknown }).status) || 500
      : 500;
  const message =
    err instanceof Error ? err.message : "Something went wrong contacting the AI service.";
  return NextResponse.json({ error: message }, { status });
}

// ------------------------------------------------------------------
// AI feature 1: plain-words job description → draft quote line items.
// ------------------------------------------------------------------

const QUOTE_ASSIST_PROMPT = `You are an estimating assistant for skilled trades contractors (plumbing, electrical, HVAC, general contracting, landscaping, roofing, painting).

Given a contractor's plain-words description of a job, draft a professional quote's line items. Split work into LABOR line items (hours of skilled work, with realistic labor rates) and MATERIALS line items (parts/fixtures with realistic material costs).

RULES:
- Use realistic US market pricing for the trade. If the description is vague, make reasonable assumptions and note them in "assumptions".
- Never invent a brand/model the user didn't mention. Generic descriptions ("50-gal electric water heater") are fine.
- Keep quantities and unit prices as plain numbers (no $ signs in numbers).
- Return 3-10 line items.

Respond with ONLY valid JSON (no markdown fences, no extra text):
{
  "lineItems": [
    { "description": "Install 50-gal electric water heater", "qty": 1, "unit_price": 850, "kind": "materials" },
    { "description": "Water heater installation labor", "qty": 3, "unit_price": 125, "kind": "labor" }
  ],
  "assumptions": "one short sentence about what you assumed, or empty string"
}`;

export async function assistQuoteLineItems(
  description: string,
  trade: string
): Promise<{ lineItems: LineItem[]; assumptions: string }> {
  const text = await callGemini(
    QUOTE_ASSIST_PROMPT,
    `Trade: ${trade || "general contracting"}\n\nJob description:\n${description}`
  );
  const parsed = extractJsonObject(text);
  const rawItems = parsed && Array.isArray(parsed.lineItems) ? parsed.lineItems : [];
  const lineItems = normalizeLineItems(rawItems);
  const assumptions =
    parsed && typeof parsed.assumptions === "string" ? parsed.assumptions : "";
  if (lineItems.length === 0) {
    throw Object.assign(
      new Error("The AI couldn't draft line items from that description. Try adding more detail."),
      { status: 502 }
    );
  }
  return { lineItems, assumptions };
}

// ------------------------------------------------------------------
// AI feature 2: follow-up nudge for a stale quote.
// ------------------------------------------------------------------

const FOLLOWUP_PROMPT = `You are writing a short, professional follow-up text message for a trades contractor (plumber, electrician, HVAC tech, etc.) to send to a homeowner who received a quote a few days ago and hasn't responded.

RULES:
- Keep it under 60 words. Casual-professional tone, like a real contractor texts.
- Reference the job and the quote total naturally.
- One soft call to action (happy to answer questions / hold the schedule slot).
- No discounts offered unless told to. No emojis. No hype.
- Sign with the business name.

Respond with ONLY valid JSON: { "message": "the text message" }`;

export async function draftFollowup(input: {
  businessName: string;
  customerName: string;
  jobTitle: string;
  total: number;
  daysStale: number;
}): Promise<string> {
  const text = await callGemini(
    FOLLOWUP_PROMPT,
    `Business: ${input.businessName}\nCustomer: ${input.customerName}\nJob: ${input.jobTitle}\nQuote total: $${input.total.toFixed(2)}\nDays since quote sent: ${input.daysStale}`,
    512
  );
  const parsed = extractJsonObject(text);
  const message =
    parsed && typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (!message) {
    throw Object.assign(new Error("The AI couldn't draft a follow-up. Please try again."), {
      status: 502,
    });
  }
  return message;
}

// ------------------------------------------------------------------
// AI feature 3: payment reminder for an overdue invoice.
// ------------------------------------------------------------------

const REMINDER_PROMPT = `You are writing a short, firm-but-polite payment reminder text message for a trades contractor to send to a customer whose invoice is overdue.

RULES:
- Keep it under 70 words. Professional, direct, not aggressive — assume they forgot.
- State the invoice title/number, the amount, and how many days overdue.
- One clear call to action (pay by end of week / reply if there's an issue).
- No threats, no legal language. No emojis.
- Sign with the business name.

Respond with ONLY valid JSON: { "message": "the text message" }`;

export async function draftPaymentReminder(input: {
  businessName: string;
  customerName: string;
  invoiceTitle: string;
  total: number;
  daysOverdue: number;
}): Promise<string> {
  const text = await callGemini(
    REMINDER_PROMPT,
    `Business: ${input.businessName}\nCustomer: ${input.customerName}\nInvoice: ${input.invoiceTitle}\nAmount: $${input.total.toFixed(2)}\nDays overdue: ${input.daysOverdue}`,
    512
  );
  const parsed = extractJsonObject(text);
  const message =
    parsed && typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (!message) {
    throw Object.assign(
      new Error("The AI couldn't draft a reminder. Please try again."),
      { status: 502 }
    );
  }
  return message;
}

// ------------------------------------------------------------------
// AI feature 4: review request after a completed job.
// ------------------------------------------------------------------

const REVIEW_PROMPT = `You are writing a short review-request text message for a trades contractor to send to a happy customer right after the job is done.

RULES:
- Keep it under 60 words. Warm, genuine, appreciative tone.
- Thank them for the work, mention the job briefly.
- Ask for a Google review with a simple ask (the contractor will paste their own review link after).
- No incentives offered for reviews (that violates review policies). No emojis.
- Sign with the business name.

Respond with ONLY valid JSON: { "message": "the text message" }`;

export async function draftReviewRequest(input: {
  businessName: string;
  customerName: string;
  jobTitle: string;
}): Promise<string> {
  const text = await callGemini(
    REVIEW_PROMPT,
    `Business: ${input.businessName}\nCustomer: ${input.customerName}\nCompleted job: ${input.jobTitle}`,
    512
  );
  const parsed = extractJsonObject(text);
  const message =
    parsed && typeof parsed.message === "string" ? parsed.message.trim() : "";
  if (!message) {
    throw Object.assign(
      new Error("The AI couldn't draft a review request. Please try again."),
      { status: 502 }
    );
  }
  return message;
}
