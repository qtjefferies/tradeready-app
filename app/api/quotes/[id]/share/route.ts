import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { ensureShareToken, getQuote, revokeShareToken } from "@/lib/store";
import { badRequest } from "@/lib/validate";
import { siteUrl } from "@/lib/site";

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The customer-facing URL for a share token. */
function shareUrl(token: string): string {
  return `${siteUrl.replace(/\/$/, "")}/q/${token}`;
}

/**
 * POST /api/quotes/[id]/share — mint (or return) this quote's share link.
 *
 * Idempotent: a quote keeps the same link for life, so a URL already texted
 * to a customer never stops working. Draft quotes are refused — a link
 * generated over an unfinished quote would show a price the contractor
 * hasn't committed to.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid quote id.");

  try {
    const quote = await getQuote(auth.user.id, id);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }
    if (quote.status === "draft") {
      return badRequest(
        "Mark the quote as sent before sharing it — a draft link would show your customer a price you haven't finished."
      );
    }

    const token = await ensureShareToken(auth.user.id, id);
    if (!token) {
      return NextResponse.json(
        { error: "Couldn't create a share link right now." },
        { status: 500 }
      );
    }
    return NextResponse.json({ token, url: shareUrl(token) });
  } catch (err) {
    console.error("[quotes/:id/share] create failed:", err);
    return NextResponse.json(
      { error: "Couldn't create a share link right now." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quotes/[id]/share — revoke the link.
 *
 * The quote keeps its view and response history; only the URL stops working.
 * A later re-share mints a new token, so the old link stays dead.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = parseId(params.id);
  if (!id) return badRequest("Invalid quote id.");

  try {
    const ok = await revokeShareToken(auth.user.id, id);
    if (!ok) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[quotes/:id/share] revoke failed:", err);
    return NextResponse.json(
      { error: "Couldn't revoke the share link right now." },
      { status: 500 }
    );
  }
}
