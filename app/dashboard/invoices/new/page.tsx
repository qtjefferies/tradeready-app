import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import InvoiceEditor from "@/components/InvoiceEditor";

export const metadata: Metadata = {
  title: "New invoice",
  description: "Create an invoice — or start from an accepted quote.",
};

export default async function NewInvoicePage({
  searchParams,
}: {
  // Matches the ?fromQuote=<id> links in QuoteEditor and the Money Found
  // screen — a previous from_quote spelling silently dropped the seed.
  searchParams: { fromQuote?: string };
}) {
  const user = await requireUser();
  const [customers, settings] = await Promise.all([
    store.listCustomers(user.id),
    store.getSettings(user.id),
  ]);
  const fromQuoteId = searchParams.fromQuote ? Number(searchParams.fromQuote) : null;
  const seedQuote =
    fromQuoteId && Number.isInteger(fromQuoteId)
      ? await store.getQuote(user.id, fromQuoteId)
      : null;
  const seeded = seedQuote
    ? {
        // quote_id links the invoice back to its quote: without it, Money
        // Found keeps flagging the accepted quote as unbilled work.
        quote_id: seedQuote.id,
        title: `Invoice — ${seedQuote.title}`,
        customer_id: seedQuote.customer_id,
        customer_name: seedQuote.customer_name,
        line_items: seedQuote.line_items,
        tax_pct: seedQuote.tax_pct,
        discount: seedQuote.discount,
        notes: seedQuote.notes,
      }
    : null;
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-paper">New invoice</h2>
      <InvoiceEditor
        initial={null}
        customers={customers}
        seeded={seeded}
        defaultTaxPct={settings?.defaultTaxPct ?? 0}
      />
    </div>
  );
}
