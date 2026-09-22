import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import type { LineItem } from "./money";
import { normalizeLineItems } from "./money";

/**
 * Shared Claude helper for TradeReady's AI features.
 *
 * Runs server-side only: `ANTHROPIC_API_KEY` is read from the environment and
 * never leaves the server. When the key is missing, callers get an honest 503
 * — the client shows that message rather than a fabricated result.
 *
 * This replaced a Gemini integration that had to strip markdown fences off
 * the response and hope the JSON parsed. Structured outputs remove that whole
 * class of failure: the schema goes with the request and the SDK hands back a
 * validated object, so a malformed draft can't reach a customer's quote.
 */

/**
 * Haiku 4.5 by default: roughly a fifth the cost of the Opus tier, which is
 * what matters while the app is free and every draft comes out of pocket.
 * Drafts are shorter and blunter — fine for a sixty-word text message, and
 * the contractor reviews every one before it goes anywhere.
 *
 * Set ANTHROPIC_MODEL=claude-opus-5 for noticeably better estimating
 * judgement on the quote drafter if the bill ever stops being the constraint.
 */
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

/**
 * `output_config.effort` is REJECTED WITH A 400 on Haiku 4.5 and Sonnet 4.5 —
 * it's a feature of the Opus tier and the 5-series. Sending it to the default
 * model would fail every single call, so it's attached only when the
 * configured model actually takes it. The same request otherwise.
 */
const EFFORT_UNSUPPORTED = /haiku-4-5|sonnet-4-5|-3-5-|-3-opus|-3-haiku/;

function supportsEffort(model: string): boolean {
  return !EFFORT_UNSUPPORTED.test(model);
}

/**
 * Effort tunes how hard the model works before answering, on models that
 * support it. Pricing a job is the one call here with real judgement in it —
 * realistic labour hours and material costs — so it gets `medium`. The
 * message drafters are writing three sentences in a known voice; `low` is
 * cheaper and faster and the output is indistinguishable.
 */
type Effort = "low" | "medium";

function outputConfig<T>(effort: Effort, format: T) {
  return supportsEffort(MODEL) ? { effort, format } : { format };
}

/**
 * Bounded ceilings — an unbounded `max_tokens` on a free tier is an unbounded
 * bill. The headroom above the visible answer is for thinking tokens, which
 * count against this limit on the models that think; Haiku doesn't, so it
 * never gets near these.
 */
const MAX_TOKENS_PRICING = 8000;
const MAX_TOKENS_WRITING = 4000;

let client: Anthropic | null = null;

/**
 * An org-level API key has no workspace attached, and the API rejects it with
 * a 400 unless the request names one. A key created inside a workspace
 * carries that already and needs nothing here — so the header is sent only
 * when ANTHROPIC_WORKSPACE_ID is set, and both kinds of key work.
 */
function getClient(): Anthropic {
  if (!client) {
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
    client = new Anthropic(
      workspace
        ? { defaultHeaders: { "anthropic-workspace-id": workspace } }
        : {}
    );
  }
  return client;
}

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function aiNotConfigured(): NextResponse {
  return NextResponse.json(
    {
      error: "AI not configured",
      detail:
        "The site owner hasn't added an ANTHROPIC_API_KEY yet, so this feature can't run. No result was fabricated.",
    },
    { status: 503 }
  );
}

/**
 * Map an SDK error onto an honest status and a message a contractor standing
 * in a driveway can act on. Typed classes, never string matching.
 */
export function aiErrorResponse(err: unknown): NextResponse {
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json(
      { error: "The AI is busy right now. Try again in a moment." },
      { status: 429 }
    );
  }
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("[ai] bad API key");
    return NextResponse.json(
      { error: "The AI isn't set up correctly. Nothing was drafted." },
      { status: 503 }
    );
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return NextResponse.json(
      { error: "Couldn't reach the AI service. Check back shortly." },
      { status: 502 }
    );
  }
  if (err instanceof Anthropic.BadRequestError) {
    // Almost always an account or setup problem — no credits, an unscoped
    // key, a retired model id. The contractor can't fix any of those, so
    // don't invite a retry that will fail the same way. The real reason goes
    // to the log for whoever runs the site. Running out of credits is the
    // most likely version of this in production.
    console.error("[ai] request rejected:", err.message);
    return NextResponse.json(
      {
        error: "AI unavailable",
        detail:
          "The AI provider rejected the request, so nothing was drafted. This is a setup or billing problem on the site's account, not something you did.",
      },
      { status: 503 }
    );
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[ai] API error:", err.status, err.message);
    return NextResponse.json(
      { error: "The AI service returned an error. Please try again in a moment." },
      { status: 502 }
    );
  }
  console.error("[ai] unexpected error:", err);
  return NextResponse.json(
    { error: "Something went wrong contacting the AI service." },
    { status: 500 }
  );
}

/** A refusal or an empty parse is reported, never silently papered over. */
function assertUsable<T>(parsed: T | null | undefined, stopReason: string | null): T {
  if (stopReason === "refusal") {
    throw Object.assign(
      new Error("The AI declined to draft that. Try rewording the job details."),
      { status: 422 }
    );
  }
  if (parsed === null || parsed === undefined) {
    throw Object.assign(
      new Error("The AI couldn't draft that. Please try again."),
      { status: 502 }
    );
  }
  return parsed;
}

// ------------------------------------------------------------------
// AI feature 1: plain-words job description → draft quote line items.
// ------------------------------------------------------------------

const QuoteDraftSchema = z.object({
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        qty: z.number(),
        unit_price: z.number(),
        kind: z.enum(["labor", "materials"]),
      })
    )
    .min(1)
    .max(12),
  assumptions: z.string(),
});

const QUOTE_ASSIST_PROMPT = `You are an estimating assistant for skilled trades contractors (plumbing, electrical, HVAC, general contracting, landscaping, roofing, painting).

Given a contractor's plain-words description of a job, draft a professional quote's line items. Split work into LABOR line items (hours of skilled work, with realistic labor rates) and MATERIALS line items (parts/fixtures with realistic material costs).

RULES:
- Use realistic US market pricing for the trade. If the description is vague, make reasonable assumptions and state them in "assumptions".
- Never invent a brand or model the user didn't mention. Generic descriptions ("50-gal electric water heater") are fine.
- Quantities and unit prices are plain numbers — no currency symbols.
- Return 3-10 line items.
- "assumptions" is one short sentence, or an empty string if you assumed nothing.`;

export async function assistQuoteLineItems(
  description: string,
  trade: string
): Promise<{ lineItems: LineItem[]; assumptions: string }> {
  const res = await getClient().messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS_PRICING,
    system: QUOTE_ASSIST_PROMPT,
    output_config: outputConfig("medium", zodOutputFormat(QuoteDraftSchema)),
    messages: [
      {
        role: "user",
        content: `Trade: ${trade || "general contracting"}\n\nJob description:\n${description}`,
      },
    ],
  });

  const parsed = assertUsable(res.parsed_output, res.stop_reason);
  // Still normalised: the schema guarantees shape, not that the numbers are
  // sane. normalizeLineItems clamps negatives and drops empty rows, and the
  // server recomputes every total from these regardless.
  const lineItems = normalizeLineItems(parsed.lineItems);
  if (lineItems.length === 0) {
    throw Object.assign(
      new Error("The AI couldn't draft line items from that description. Try adding more detail."),
      { status: 502 }
    );
  }
  return { lineItems, assumptions: parsed.assumptions ?? "" };
}

// ------------------------------------------------------------------
// Message drafters. All four return one short text the contractor sends
// themselves — nothing is delivered from here.
// ------------------------------------------------------------------

const MessageSchema = z.object({ message: z.string().min(1) });

async function draftMessage(system: string, context: string): Promise<string> {
  const res = await getClient().messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS_WRITING,
    system,
    output_config: outputConfig("low", zodOutputFormat(MessageSchema)),
    messages: [{ role: "user", content: context }],
  });
  const parsed = assertUsable(res.parsed_output, res.stop_reason);
  const message = parsed.message.trim();
  if (!message) {
    throw Object.assign(new Error("The AI returned an empty draft. Please try again."), {
      status: 502,
    });
  }
  return message;
}

const FOLLOWUP_PROMPT = `You are writing a short, professional follow-up text message for a trades contractor (plumber, electrician, HVAC tech, etc.) to send to a homeowner who received a quote a few days ago and hasn't responded.

RULES:
- Under 60 words. Casual-professional, the way a real contractor texts.
- Reference the job and the quote total naturally.
- One soft call to action (happy to answer questions / can hold the schedule slot).
- No discounts unless told to. No emojis. No hype.
- Sign off with the business name.`;

export async function draftFollowup(input: {
  businessName: string;
  customerName: string;
  jobTitle: string;
  total: number;
  daysStale: number;
}): Promise<string> {
  return draftMessage(
    FOLLOWUP_PROMPT,
    `Business: ${input.businessName}\nCustomer: ${input.customerName}\nJob: ${input.jobTitle}\nQuote total: $${input.total.toFixed(2)}\nDays since the quote was sent: ${input.daysStale}`
  );
}

const REMINDER_PROMPT = `You are writing a short, firm-but-polite payment reminder text message for a trades contractor to send to a customer whose invoice is overdue.

RULES:
- Under 70 words. Professional and direct, not aggressive — assume they simply forgot.
- State the invoice title, the amount, and how many days overdue it is.
- One clear call to action (pay by end of week / reply if there's a problem).
- No threats, no legal language, no emojis.
- Sign off with the business name.`;

export async function draftPaymentReminder(input: {
  businessName: string;
  customerName: string;
  invoiceTitle: string;
  total: number;
  daysOverdue: number;
}): Promise<string> {
  return draftMessage(
    REMINDER_PROMPT,
    `Business: ${input.businessName}\nCustomer: ${input.customerName}\nInvoice: ${input.invoiceTitle}\nAmount: $${input.total.toFixed(2)}\nDays overdue: ${input.daysOverdue}`
  );
}

const REVIEW_PROMPT = `You are writing a short review-request text message for a trades contractor to send to a happy customer right after the job is done.

RULES:
- Under 60 words. Warm, genuine, appreciative.
- Thank them for the work and mention the job briefly.
- Ask for a Google review with a simple ask — the contractor pastes their own review link after.
- Never offer an incentive for a review; that breaks review-platform policy.
- No emojis.
- Sign off with the business name.`;

export async function draftReviewRequest(input: {
  businessName: string;
  customerName: string;
  jobTitle: string;
}): Promise<string> {
  return draftMessage(
    REVIEW_PROMPT,
    `Business: ${input.businessName}\nCustomer: ${input.customerName}\nCompleted job: ${input.jobTitle}`
  );
}

const REACTIVATION_PROMPT = `You are writing a short outreach text message for a trades contractor (plumber, electrician, HVAC tech, roofer, etc.) reaching back out to a PAST customer. There is an existing relationship here — this is not a cold lead.

You will be told which of three situations applies:

- "equipment": a unit the contractor installed years ago is near or past its typical service life. Mention the unit and roughly how long ago it went in, and offer to take a look. Do NOT claim it is broken, failing, unsafe, or about to fail — you have no idea what condition it is in, and a scare tactic would be a lie. Frame it as worth looking at while they still have options, not "replace this now".
- "dormant": it has simply been a long time. Warm check-in, no invented pretext. Do not reference work you weren't told about.
- "declined": they turned down a quote a while back. Acknowledge it lightly and without pressure, note that pricing and availability move, and offer to take another look. Never imply they made a mistake.

RULES:
- Under 65 words. The way a real tradesperson texts: plain, warm, not salesy.
- No emojis, no hype, at most one exclamation mark.
- No discounts, no urgency pressure, no invented deadlines.
- Never state a price — the contractor prices the job, not the message.
- Never invent details you weren't given: no model numbers, no diagnoses, no past conversations.
- Sign off with the business name.`;

export type ReactivationKind = "equipment" | "dormant" | "declined";

export async function draftReactivation(input: {
  businessName: string;
  customerName: string;
  kind: ReactivationKind;
  subject: string;
  yearsAgo: number;
}): Promise<string> {
  const context =
    input.kind === "equipment"
      ? `Situation: equipment\nUnit installed: ${input.subject}\nInstalled about ${input.yearsAgo} years ago`
      : input.kind === "declined"
      ? `Situation: declined\nJob they turned down: ${input.subject}\nAbout ${input.yearsAgo} year(s) ago`
      : `Situation: dormant\nIt has been about ${input.yearsAgo} year(s) since their last job`;

  return draftMessage(
    REACTIVATION_PROMPT,
    `Business: ${input.businessName}\nCustomer: ${input.customerName}\n${context}`
  );
}
