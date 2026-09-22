import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getPublicBusinessInfo, getInvoice } from "@/lib/store";
import { buildDocumentPdf, pdfResponse, safeFilename } from "@/lib/pdf";
import { badRequest } from "@/lib/validate";

/**
 * GET /api/invoices/[id]/pdf — download a branded invoice PDF.
 * Runs on the Node runtime (pdfkit needs Node streams).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  unpaid: "Unpaid",
  sent: "Sent",
  overdue: "Overdue",
  paid: "Paid",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return badRequest("Invalid invoice id.");

  try {
    const [invoice, biz] = await Promise.all([
      getInvoice(auth.user.id, id),
      getPublicBusinessInfo(auth.user.id),
    ]);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const meta: { label: string; value: string }[] = [
      { label: "Status", value: STATUS_LABEL[invoice.status] ?? invoice.status },
    ];
    if (invoice.due_at) meta.push({ label: "Due date", value: invoice.due_at });
    if (invoice.paid_at) meta.push({ label: "Paid", value: invoice.paid_at });

    const pdf = await buildDocumentPdf(
      biz,
      {
        kind: "invoice",
        number: `INV-${invoice.id}`,
        title: invoice.title,
        customerName: invoice.customer_name,
        lineItems: invoice.line_items,
        taxPct: invoice.tax_pct,
        discount: invoice.discount,
        notes: invoice.notes,
        issuedLabel: "Invoice date",
        issuedValue: new Date(invoice.created_at).toLocaleDateString(),
        extraMeta: meta,
      }
    );
    return pdfResponse(pdf, safeFilename("invoice", invoice.title, invoice.id));
  } catch (err) {
    console.error("[invoices/pdf] failed:", err);
    return NextResponse.json(
      { error: "Couldn't generate the PDF right now." },
      { status: 500 }
    );
  }
}
