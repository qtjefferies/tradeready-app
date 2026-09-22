import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { createReview, listReviews } from "@/lib/store";
import { badRequest, parseReviewCreate, readJson } from "@/lib/validate";

/** GET /api/reviews — list review requests. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const reviews = await listReviews(auth.user.id);
    return NextResponse.json({ reviews });
  } catch (err) {
    console.error("[reviews] list failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your reviews right now." },
      { status: 500 }
    );
  }
}

/** POST /api/reviews — log a review request sent to a customer. */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseReviewCreate(body);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const review = await createReview(auth.user.id, parsed.value);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error("[reviews] create failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the review request right now." },
      { status: 500 }
    );
  }
}
