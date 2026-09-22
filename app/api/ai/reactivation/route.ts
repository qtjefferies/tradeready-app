import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  draftReactivation,
  aiConfigured,
  aiErrorResponse,
  aiNotConfigured,
  type ReactivationKind,
} from "@/lib/ai";
import { badRequest, readJson } from "@/lib/validate";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * A slow turn shouldn't hit the platform timeout, which returns an error page
 * instead of this route's honest JSON. The route finishes as soon as the model
 * answers; this is only the ceiling.
 */
export const maxDuration = 120;

const KINDS: ReactivationKind[] = ["equipment", "dormant", "declined"];

/**
 * POST /api/ai/reactivation — draft outreach for a Money Found opportunity.
 * Body: { kind, customer_name, subject, years_ago }
 *
 * The contractor copies the result into their own messages. Nothing is sent
 * from here, the same as every other AI feature in the app.
 *
 * Every call here costs money at the AI provider, and an account is free to
 * create — so without a cap, one signup with a loop is an open tap on the
 * bill. The per-account limit is far above real use and only bites automation.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const limit = await rateLimit(`ai:reactivation:${auth.user.id}`, 60, 3600);
  if (!limit.allowed) {
    return tooManyRequests(
      limit,
      "You've hit the hourly limit for AI drafting. Try again shortly."
    );
  }
  if (!aiConfigured()) return aiNotConfigured();

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as {
    kind?: unknown;
    customer_name?: unknown;
    subject?: unknown;
    years_ago?: unknown;
  };

  const kind = KINDS.includes(b.kind as ReactivationKind)
    ? (b.kind as ReactivationKind)
    : null;
  if (!kind) return badRequest("Unknown outreach type.");

  const customerName =
    typeof b.customer_name === "string" ? b.customer_name.trim().slice(0, 200) : "";
  const subject =
    typeof b.subject === "string" ? b.subject.trim().slice(0, 300) : "";
  if (!subject) return badRequest("Missing the subject of the message.");

  const yearsRaw = Number(b.years_ago);
  const yearsAgo = Number.isFinite(yearsRaw)
    ? Math.min(50, Math.max(0, Math.round(yearsRaw)))
    : 0;

  try {
    const message = await draftReactivation({
      businessName: auth.user.businessName || "us",
      customerName: customerName || "there",
      kind,
      subject,
      yearsAgo,
    });
    return NextResponse.json({ message });
  } catch (err) {
    console.error("[ai/reactivation] failed:", err);
    return aiErrorResponse(err);
  }
}
