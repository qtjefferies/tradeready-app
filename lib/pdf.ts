import PDFDocument from "pdfkit";
import { computeTotals, formatUSD, type LineItem } from "./money";

/**
 * Branded PDF builder for quotes and invoices.
 * Header carries the contractor's business name, trade, phone, and email;
 * line items split labor vs materials; totals show discount and tax.
 */

export const runtime = "nodejs";

const MARGIN = 54;
const ACCENT = "#b45309"; // amber-700 — workwear accent
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";

export interface BusinessInfo {
  businessName: string;
  trade: string;
  phone: string;
  email: string;
}

export interface DocumentData {
  kind: "quote" | "invoice";
  number: string; // e.g. "Q-1042" or "INV-301"
  title: string;
  customerName: string;
  lineItems: LineItem[];
  taxPct: number;
  discount: number;
  notes: string;
  issuedLabel: string; // "Quote date" / "Invoice date"
  issuedValue: string;
  extraMeta: { label: string; value: string }[]; // valid-until, due date, status…
}

function sectionRule(doc: PDFKit.PDFDocument) {
  doc
    .moveTo(MARGIN, doc.y + 2)
    .lineTo(doc.page.width - MARGIN, doc.y + 2)
    .strokeColor(LINE)
    .lineWidth(0.75)
    .stroke();
  doc.moveDown(0.6);
}

function header(doc: PDFKit.PDFDocument, biz: BusinessInfo, d: DocumentData) {
  const kindLabel = d.kind === "quote" ? "QUOTE" : "INVOICE";
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(INK)
    .text(biz.businessName || "TradeReady Contractor", { align: "left" });
  if (biz.trade) {
    doc.moveDown(0.15);
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(biz.trade);
  }
  const contact = [biz.phone, biz.email].filter(Boolean).join("  |  ");
  if (contact) {
    doc.moveDown(0.1);
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(contact);
  }

  doc.moveDown(0.8);
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(ACCENT)
    .text(`${kindLabel}  ${d.number}`);
  doc.moveDown(0.25);
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(d.title);
  doc.moveDown(0.25);
  doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`Bill to: ${d.customerName || "—"}`);
  doc.moveDown(0.2);
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(MUTED)
    .text(`${d.issuedLabel}: ${d.issuedValue}`);
  for (const m of d.extraMeta) {
    doc.moveDown(0.1);
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(`${m.label}: ${m.value}`);
  }
  doc.moveDown(0.6);
  sectionRule(doc);
}

function lineItemTable(doc: PDFKit.PDFDocument, items: LineItem[]) {
  const labor = items.filter((i) => i.kind === "labor");
  const materials = items.filter((i) => i.kind === "materials");

  const group = (label: string, rows: LineItem[]) => {
    if (rows.length === 0) return;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(label.toUpperCase(), {
      characterSpacing: 1,
    });
    doc.moveDown(0.25);
    for (const r of rows) {
      const amount = r.qty * r.unit_price;
      const qtyLabel = r.qty === 1 ? "1" : String(r.qty);
      doc.font("Helvetica").fontSize(10).fillColor(INK);
      const y = doc.y;
      doc.text(r.description, MARGIN, y, { width: 300, lineGap: 2 });
      doc.text(
        `${qtyLabel} × ${formatUSD(r.unit_price)}`,
        MARGIN + 310,
        y,
        { width: 110, align: "right" }
      );
      doc.text(formatUSD(amount), MARGIN + 420, y, { width: 90, align: "right" });
      doc.moveDown(0.5);
    }
    doc.moveDown(0.4);
  };

  group("Labor", labor);
  group("Materials", materials);
}

function totalsBlock(doc: PDFKit.PDFDocument, items: LineItem[], taxPct: number, discount: number) {
  const t = computeTotals(items, taxPct, discount);
  const right = doc.page.width - MARGIN;
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10);
    doc.fillColor(bold ? INK : MUTED);
    const y = doc.y;
    doc.text(label, MARGIN + 280, y, { width: 140, align: "right" });
    doc.fillColor(bold ? ACCENT : INK);
    doc.text(value, right - 100, y, { width: 100, align: "right" });
    doc.moveDown(0.35);
  };
  doc.moveDown(0.4);
  row("Subtotal", formatUSD(t.subtotal));
  if (t.discount > 0) row("Discount", `−${formatUSD(t.discount)}`);
  if (t.tax > 0) row(`Tax (${taxPct}%)`, formatUSD(t.tax));
  sectionRule(doc);
  row("TOTAL DUE", formatUSD(t.total), true);
}

function footer(doc: PDFKit.PDFDocument) {
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#94a3b8")
      .text(
        "Generated with TradeReady — verify all details before sending.",
        MARGIN,
        doc.page.height - 36,
        { align: "center", width: doc.page.width - MARGIN * 2 }
      );
  }
}

/** Build a branded quote/invoice PDF and return it as a Buffer. */
export async function buildDocumentPdf(
  biz: BusinessInfo,
  d: DocumentData
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  header(doc, biz, d);
  lineItemTable(doc, d.lineItems);
  totalsBlock(doc, d.lineItems, d.taxPct, d.discount);
  if (d.notes.trim()) {
    doc.moveDown(0.8);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text("NOTES");
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(10).fillColor("#334155").text(d.notes.trim(), { lineGap: 3 });
  }
  footer(doc);

  doc.end();
  await finished;
  return Buffer.concat(chunks);
}

export function safeFilename(prefix: string, title: string, id: number): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "document";
  return `${prefix}-${id}-${slug}.pdf`;
}

export function pdfResponse(pdf: Buffer, filename: string): Response {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
    },
  });
}
