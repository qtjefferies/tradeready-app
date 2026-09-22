import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { deleteReview, markReviewReceived } from "@/lib/store";
import { badRequest, readJson } from "@/lib/validate";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * PUT /api/reviews/[id] — mark a review as received.
 * Body: { rating: 1-5, review_text?: string }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid review id.");

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as Record<string, unknown>;
  const rating = typeof b.rating === "number" ? b.rating : Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return badRequest("Rating must be a whole number from 1 to 5.");
  }
  const reviewText =
    typeof b.review_text === "string" ? b.review_text.trim().slice(0, 5000) : "";

  try {
    const review = await markReviewReceived(auth.user.id, id, rating, reviewText);
    if (!review) {
      return NextResponse.json({ error: "Review request not found." }, { status: 404 });
    }
    return NextResponse.json({ review });
  } catch (err) {
    console.error("[reviews/:id] update failed:", err);
    return NextResponse.json(
      { error: "Couldn't save the review right now." },
      { status: 500 }
    );
  }
}

/** DELETE /api/reviews/[id] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid review id.");

  try {
    const ok = await deleteReview(auth.user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Review request not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reviews/:id] delete failed:", err);
    return NextResponse.json(
      { error: "Couldn't delete the review request right now." },
      { status: 500 }
    );
  }
}
