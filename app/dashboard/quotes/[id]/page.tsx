import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import QuoteEditor from "@/components/QuoteEditor";

export const metadata: Metadata = {
  title: "Quote",
  description: "Edit your quote.",
};

export default async function QuotePage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [quote, customers] = await Promise.all([
    store.getQuote(user.id, id),
    store.listCustomers(user.id),
  ]);
  if (!quote) notFound();
  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold text-white">
        Quote #{quote.id} — {quote.title}
      </h2>
      <QuoteEditor initial={quote} customers={customers} trade={user.trade} />
    </div>
  );
}
