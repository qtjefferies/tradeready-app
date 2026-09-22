import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getCustomer, getJob } from "@/lib/store";
import {
  draftReviewRequest,
  geminiConfigured,
  geminiErrorResponse,
  geminiNotConfigured,
} from "@/lib/gemini";
import { badRequest, readJson } from "@/lib/validate";

/**
 * POST /api/ai/review-request — draft a review-request text after a job.
 * Body: { customer_id?: number, job_id?: number, customer_name?: string, job_title?: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!geminiConfigured()) return geminiNotConfigured();

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
    return geminiErrorResponse(err);
  }
}
