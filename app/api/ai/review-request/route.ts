import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getCustomer, getJob } from "@/lib/store";
import {
  draftReviewRequest,
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
 * POST /api/ai/review-request — draft a review-request text after a job.
 * Body: { customer_id?: number, job_id?: number, customer_name?: string, job_title?: string }
 *
 * Every call here costs money at the AI provider, and an account is free to
 * create — so without a cap, one signup with a loop is an open tap on the
 * bill. The per-account limit is far above real use and only bites automation.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const limit = await rateLimit(`ai:review-request:${auth.user.id}`, 60, 3600);
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
    customer_id?: unknown;
    job_id?: unknown;
    customer_name?: unknown;
    job_title?: unknown;
  };

  try {
    let customerName =
      typeof b.customer_name === "string" ? b.customer_name.trim() : "";
    let jobTitle = typeof b.job_title === "string" ? b.job_title.trim() : "";

    const customerId =
      typeof b.customer_id === "number" ? b.customer_id : Number(b.customer_id);
    if (!customerName && Number.isInteger(customerId) && customerId > 0) {
      const c = await getCustomer(auth.user.id, customerId);
      if (c) customerName = c.name;
    }
    const jobId = typeof b.job_id === "number" ? b.job_id : Number(b.job_id);
    if (!jobTitle && Number.isInteger(jobId) && jobId > 0) {
      const j = await getJob(auth.user.id, jobId);
      if (j) {
        jobTitle = j.title;
        if (!customerName) customerName = j.customer_name;
      }
    }

    if (!customerName && !jobTitle) {
      return badRequest("Pick a customer or job for the review request.");
    }

    const message = await draftReviewRequest({
      businessName: auth.user.businessName || "us",
      customerName: customerName || "there",
      jobTitle: jobTitle || "the recent work",
    });
    return NextResponse.json({ message });
  } catch (err) {
    console.error("[ai/review-request] failed:", err);
    return aiErrorResponse(err);
  }
}
