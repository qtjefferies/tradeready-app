import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import type { QuoteDefaults } from "@/components/QuoteEditor";
import NewQuoteClient from "./NewQuoteClient";

export const metadata: Metadata = {
  title: "New quote",
  description: "Create a quote — AI can draft the line items from your description.",
};

export default async function NewQuotePage() {
  const user = await requireUser();
  const [customers, settings] = await Promise.all([
    store.listCustomers(user.id),
    store.getSettings(user.id),
  ]);

  // Settings promises these are "applied to new quotes so you stop retyping
  // the same numbers" — this is where that promise is kept. A quote already
  // saved keeps whatever it was saved with; only new ones get the defaults.
  const defaults: QuoteDefaults | null = settings
    ? {
        taxPct: settings.defaultTaxPct,
        notes: settings.defaultQuoteNotes,
        validDays: settings.defaultPaymentTermsDays,
      }
    : null;

  return <NewQuoteClient customers={customers} trade={user.trade} defaults={defaults} />;
}
