import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getPublicBusinessInfo, getQuote } from "@/lib/store";
import { buildDocumentPdf, pdfResponse, safeFilename } from "@/lib/pdf";
import { badRequest } from "@/lib/validate";

/**
 * GET /api/quotes/[id]/pdf — download a branded quote PDF.
 * Runs on the Node runtime (pdfkit needs Node streams).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return badRequest("Invalid quote id.");

  try {
    const [quote, biz] = await Promise.all([
      getQuote(auth.user.id, id),
      getPublicBusinessInfo(auth.user.id),
    ]);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }

    const meta: { label: string; value: string }[] = [
      { label: "Status", value: STATUS_LABEL[quote.status] ?? quote.status },
    ];
    if (quote.valid_until) {
      meta.push({ label: "Valid until", value: quote.valid_until });
    }

    const pdf = await buildDocumentPdf(
      biz,
      {
        kind: "quote",
        number: `Q-${quote.id}`,
        title: quote.title,
        customerName: quote.customer_name,
        lineItems: quote.line_items,
        taxPct: quote.tax_pct,
        discount: quote.discount,
        notes: quote.notes,
        issuedLabel: "Quote date",
        issuedValue: new Date(quote.created_at).toLocaleDateString(),
        extraMeta: meta,
      }
    );
    return pdfResponse(pdf, safeFilename("quote", quote.title, quote.id));
  } catch (err) {
    console.error("[quotes/pdf] failed:", err);
    return NextResponse.json(
      { error: "Couldn't generate the PDF right now." },
      { status: 500 }
    );
  }
}
