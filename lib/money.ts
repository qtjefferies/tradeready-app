/**
 * Money + line-item helpers shared by the UI, API, and PDF export.
 *
 * Line items: { description, qty, unit_price, kind: "labor" | "materials" }
 * Totals: subtotal → minus discount → plus tax on the discounted subtotal.
 */

export type LineItemKind = "labor" | "materials";

export interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
  kind: LineItemKind;
}

export interface Totals {
  subtotal: number;
  laborTotal: number;
  materialsTotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

function toNumber(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Normalize a raw JSONB value into clean line items. */
export function normalizeLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = r as Record<string, unknown>;
      const description =
        typeof o.description === "string" ? o.description.trim() : "";
      const qty = Math.max(0, toNumber(o.qty, 1));
      const unit_price = Math.max(0, toNumber(o.unit_price, 0));
      // Tolerate the singular: the AI drafter routinely returns "material",
      // and an exact-match check silently relabelled those rows as labor —
      // which also threw off the labor/materials subtotals below.
      const rawKind = typeof o.kind === "string" ? o.kind.trim().toLowerCase() : "";
      const kind: LineItemKind = rawKind.startsWith("material") ? "materials" : "labor";
      return { description, qty, unit_price, kind };
    })
    .filter((i) => i.description.length > 0 || i.unit_price > 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Compute totals from line items, discount (flat $), and tax %. */
export function computeTotals(
  items: LineItem[],
  taxPct: number,
  discount: number
): Totals {
  const laborTotal = round2(
    items
      .filter((i) => i.kind === "labor")
      .reduce((s, i) => s + i.qty * i.unit_price, 0)
  );
  const materialsTotal = round2(
    items
      .filter((i) => i.kind === "materials")
      .reduce((s, i) => s + i.qty * i.unit_price, 0)
  );
  const subtotal = round2(laborTotal + materialsTotal);
  const discountAmt = round2(Math.min(Math.max(0, discount), subtotal));
  const taxable = round2(subtotal - discountAmt);
  const tax = round2(taxable * (Math.max(0, taxPct) / 100));
  const total = round2(taxable + tax);
  return { subtotal, laborTotal, materialsTotal, discount: discountAmt, taxable, tax, total };
}

/** Format a number as USD, e.g. 1234.5 → "$1,234.50". */
export function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

/**
 * Format a stored tax percentage for display, e.g. 8.880000114440918 → "8.88%".
 * Float columns (REAL) don't round-trip decimals exactly, so every raw
 * `{tax_pct}%` interpolation is a latent "8.880000114440918%" bug — always
 * go through here instead.
 */
export function formatPct(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(parseFloat(rounded.toFixed(2)));
  return `${text}%`;
}
