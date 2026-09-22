import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import QuoteEditor from "@/components/QuoteEditor";

export const metadata: Metadata = {
  title: "New quote",
  description: "Create a quote — AI can draft the line items from your description.",
};

export default async function NewQuotePage() {
  const user = await requireUser();
  const customers = await store.listCustomers(user.id);
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-paper">New quote</h2>
      <QuoteEditor initial={null} customers={customers} trade={user.trade} />
    </div>
  );
}
