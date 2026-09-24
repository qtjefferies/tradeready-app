import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { NextResponse } from "next/server";
import type { LineItem } from "./money";
import { normalizeLineItems } from "./money";

/**
 * Shared AI helper for TradeReady's drafting features.
 *
 * Runs server-side only: every key is read from the environment and never
 * leaves the server. When no provider is configured, callers get an honest
 * 503 — the client shows that message rather than a fabricated result.
 *
 * Three providers, one contract — each feature asks for a JSON object that
 * matches a zod schema and gets back a validated object or an error:
 *
 * - "huggingface": Hugging Face Inference Providers (router.huggingface.co),
 *   OpenAI-compatible. Key: HF_TOKEN.
 * - "ollama": Ollama Cloud (ollama.com) with OLLAMA_API_KEY, or a self-hosted
 *   Ollama server via OLLAMA_BASE_URL. Also OpenAI-compatible.
 * - "anthropic": Claude, with native structured outputs. Key: ANTHROPIC_API_KEY.
 *
 * AI_PROVIDER picks one explicitly. Without it, the first provider with a key
 * wins, in the order above.
 */

type Provider = "huggingface" | "ollama" | "anthropic";

function hfToken(): string | undefined {
  return process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || undefined;
}

function ollamaReady(): boolean {
  return Boolean(process.env.OLLAMA_API_KEY || process.env.OLLAMA_BASE_URL);
}

function provider(): Provider | null {
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (explicit === "huggingface" || explicit === "hf") return hfToken() ? "huggingface" : null;
  if (explicit === "ollama") return ollamaReady() ? "ollama" : null;
  if (explicit === "anthropic") return process.env.ANTHROPIC_API_KEY ? "anthropic" : null;
  if (hfToken()) return "huggingface";
  if (ollamaReady()) return "ollama";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

/**
 * gpt-oss-120b by default on both open-model providers. It's the strongest
 * open model that is cheap to run, reliable at producing strict JSON, and
 * has a reasoning dial — the quote drafter's pricing judgement is the one
 * call here that benefits from thinking. It's also hosted on both Hugging
 * Face and Ollama Cloud, so switching provider doesn't change the output.
 *
 * AI_MODEL overrides it (e.g. "Qwen/Qwen3-235B-A22B-Instruct-2507" on
 * Hugging Face, or "qwen3:32b" on a self-hosted Ollama).
 */
function modelFor(p: Provider): string {
  const override = process.env.AI_MODEL;
  if (p === "huggingface") return override || "openai/gpt-oss-120b";
  if (p === "ollama") return override || "gpt-oss:120b";
  return process.env.ANTHROPIC_MODEL || override || "claude-haiku-4-5";
}

/**
 * Pricing a job has real judgement in it — realistic labour hours and
 * material costs — so it gets `medium`. The message drafters are writing
 * three sentences in a known voice; `low` is cheaper and faster.
 */
type Effort = "low" | "medium";

/**
 * Bounded ceilings — an unbounded `max_tokens` on a free tier is an unbounded
 * bill. The headroom above the visible answer is for reasoning tokens, which
 * count against this limit on the models that think.
 */
const MAX_TOKENS_PRICING = 8000;
const MAX_TOKENS_WRITING = 4000;

/** Serverless functions shouldn't hang on a stalled upstream. */
const REQUEST_TIMEOUT_MS = 60_000;

export function aiConfigured(): boolean {
  return provider() !== null;
}

export function aiNotConfigured(): NextResponse {
  return NextResponse.json(
    {
      error: "AI not configured",
      detail:
        "The site owner hasn't added an AI key (HF_TOKEN, OLLAMA_API_KEY or ANTHROPIC_API_KEY) yet, so this feature can't run. No result was fabricated.",
    },
    { status: 503 }
  );
}

/**
 * An error from the Hugging Face or Ollama HTTP API. `status` is the
 * upstream status, or 0 when the request never got a response.
 */
class ProviderError extends Error {
  constructor(message: string, readonly upstreamStatus: number) {
    super(message);
  }
}

function busy() {
  return NextResponse.json(
    { error: "The AI is busy right now. Try again in a moment." },
    { status: 429 }
  );
}
function badKey() {
  console.error("[ai] bad API key");
  return NextResponse.json(
    { error: "The AI isn't set up correctly. Nothing was drafted." },
    { status: 503 }
  );
}
function unreachable() {
  return NextResponse.json(
    { error: "Couldn't reach the AI service. Check back shortly." },
    { status: 502 }
  );
}
function rejected(message: string) {
  // Almost always an account or setup problem — no credits, a model the
  // provider doesn't host, a retired model id. The contractor can't fix any
  // of those, so don't invite a retry that will fail the same way. The real
  // reason goes to the log for whoever runs the site.
  console.error("[ai] request rejected:", message);
  return NextResponse.json(
    {
      error: "AI unavailable",
      detail:
        "The AI provider rejected the request, so nothing was drafted. This is a setup or billing problem on the site's account, not something you did.",
    },
    { status: 503 }
  );
}
function upstreamError(status: number, message: string) {
  console.error("[ai] API error:", status, message);
  return NextResponse.json(
    { error: "The AI service returned an error. Please try again in a moment." },
    { status: 502 }
  );
}

/**
 * Map a provider error onto an honest status and a message a contractor
 * standing in a driveway can act on.
 */
export function aiErrorResponse(err: unknown): NextResponse {
  if (err instanceof ProviderError) {
    const s = err.upstreamStatus;
    if (s === 0) return unreachable();
    if (s === 429) return busy();
    if (s === 401 || s === 403) return badKey();
    if (s === 400 || s === 402 || s === 404 || s === 422) return rejected(err.message);
    return upstreamError(s, err.message);
  }
  if (err instanceof Anthropic.RateLimitError) return busy();
  if (err instanceof Anthropic.AuthenticationError) return badKey();
  if (err instanceof Anthropic.APIConnectionError) return unreachable();
  if (err instanceof Anthropic.BadRequestError) return rejected(err.message);
  if (err instanceof Anthropic.APIError) return upstreamError(err.status ?? 0, err.message);
  // Errors thrown by the helpers below carry a user-facing message + status.
  if (err instanceof Error && typeof (err as { status?: unknown }).status === "number") {
    return NextResponse.json(
      { error: err.message },
      { status: (err as unknown as { status: number }).status }
    );
  }
  console.error("[ai] unexpected error:", err);
  return NextResponse.json(
    { error: "Something went wrong contacting the AI service." },
    { status: 500 }
  );
}

function unusable(message: string, status: number): Error {
  return Object.assign(new Error(message), { status });
}

const DRAFT_FAILED = "The AI couldn't draft that. Please try again.";

// ------------------------------------------------------------------
// Anthropic: native structured outputs.
// ------------------------------------------------------------------

/**
 * `output_config.effort` is rejected with a 400 on Haiku 4.5 and Sonnet 4.5,
 * so it's attached only when the configured model actually takes it.
 */
const EFFORT_UNSUPPORTED = /haiku-4-5|sonnet-4-5|-3-5-|-3-opus|-3-haiku/;

let anthropic: Anthropic | null = null;

/**
 * An org-level API key has no workspace attached, and the API rejects it with
 * a 400 unless the request names one — so the header is sent only when
 * ANTHROPIC_WORKSPACE_ID is set, and both kinds of key work.
 */
function getAnthropic(): Anthropic {
  if (!anthropic) {
    const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
    anthropic = new Anthropic(
      workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {}
    );
  }
  return anthropic;
}

async function anthropicJSON<T extends z.ZodType>(
  schema: T,
  system: string,
  user: string,
  effort: Effort,
  maxTokens: number
): Promise<z.infer<T>> {
  const model = modelFor("anthropic");
  const format = zodOutputFormat(schema);
  const res = await getAnthropic().messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    output_config: EFFORT_UNSUPPORTED.test(model) ? { format } : { effort, format },
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") {
    throw unusable("The AI declined to draft that. Try rewording the job details.", 422);
  }
  if (res.parsed_output === null || res.parsed_output === undefined) {
    throw unusable(DRAFT_FAILED, 502);
  }
  return res.parsed_output as z.infer<T>;
}

// ------------------------------------------------------------------
// Hugging Face / Ollama: OpenAI-compatible chat completions.
// ------------------------------------------------------------------

function openAICompatTarget(p: "huggingface" | "ollama"): { url: string; key?: string } {
  if (p === "huggingface") {
    return { url: "https://router.huggingface.co/v1/chat/completions", key: hfToken() };
  }
  // With only a key, talk to Ollama Cloud. OLLAMA_BASE_URL points at a
  // self-hosted server instead (it must be reachable from the deployment —
  // localhost only works in local dev).
  const base = (process.env.OLLAMA_BASE_URL || "https://ollama.com").replace(/\/+$/, "");
  return { url: `${base}/v1/chat/completions`, key: process.env.OLLAMA_API_KEY || undefined };
}

/**
 * Open models occasionally wrap JSON in a code fence or add a sentence
 * around it even when told not to. Take the outermost object, and let the
 * schema decide whether it's any good.
 */
function extractJSON(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

async function postChat(
  url: string,
  key: string | undefined,
  body: Record<string, unknown>
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    throw new ProviderError(err instanceof Error ? err.message : String(err), 0);
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 500);
    throw new ProviderError(`${res.status} ${detail}`, res.status);
  }
  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string | null; refusal?: string | null } }[];
  } | null;
  const message = data?.choices?.[0]?.message;
  if (message?.refusal) {
    throw unusable("The AI declined to draft that. Try rewording the job details.", 422);
  }
  return message?.content ?? "";
}

async function openAICompatJSON<T extends z.ZodType>(
  p: "huggingface" | "ollama",
  schema: T,
  system: string,
  user: string,
  effort: Effort,
  maxTokens: number
): Promise<z.infer<T>> {
  const { url, key } = openAICompatTarget(p);
  const model = modelFor(p);
  const jsonSchema = z.toJSONSchema(schema);
  // The schema also goes in the prompt: not every host behind the Hugging
  // Face router enforces response_format, and the prompt is what keeps
  // those ones on track.
  const messages = [
    {
      role: "system",
      content: `${system}

Respond with ONLY a JSON object matching this JSON Schema — no prose, no code fences:
${JSON.stringify(jsonSchema)}`,
    },
    { role: "user", content: user },
  ];
  const full: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.4,
    response_format: {
      type: "json_schema",
      json_schema: { name: "draft", schema: jsonSchema, strict: true },
    },
    // Only reasoning models take this; others may reject an unknown field.
    ...(/gpt-oss|deepseek-r|qwq/i.test(model) ? { reasoning_effort: effort } : {}),
  };

  let content: string;
  try {
    content = await postChat(url, key, full);
  } catch (err) {
    // Some hosts reject response_format or reasoning_effort outright. The
    // prompt still carries the schema, so retry once with the plain request
    // rather than failing the contractor over an optional feature.
    if (!(err instanceof ProviderError) || err.upstreamStatus !== 400) throw err;
    console.warn("[ai] retrying without structured-output options:", err.message);
    content = await postChat(url, key, { model, messages, max_tokens: maxTokens, temperature: 0.4 });
  }

  const parsed = schema.safeParse(extractJSON(content));
  if (!parsed.success) {
    console.error("[ai] response didn't match the schema:", content.slice(0, 500));
    throw unusable(DRAFT_FAILED, 502);
  }
  return parsed.data;
}

/** Ask the configured provider for a JSON object that satisfies `schema`. */
async function generateJSON<T extends z.ZodType>(
  schema: T,
  system: string,
  user: string,
  effort: Effort,
  maxTokens: number
): Promise<z.infer<T>> {
  const p = provider();
  if (!p) throw unusable("AI not configured", 503);
  if (p === "anthropic") return anthropicJSON(schema, system, user, effort, maxTokens);
  return openAICompatJSON(p, schema, system, user, effort, maxTokens);
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
  const parsed = await generateJSON(
    QuoteDraftSchema,
    QUOTE_ASSIST_PROMPT,
    `Trade: ${trade || "general contracting"}\n\nJob description:\n${description}`,
    "medium",
    MAX_TOKENS_PRICING
  );
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
  const parsed = await generateJSON(MessageSchema, system, context, "low", MAX_TOKENS_WRITING);
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
