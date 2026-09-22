import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import QuotesClient from "@/components/QuotesClient";

export const metadata: Metadata = {
  title: "Quotes",
  description: "Your quotes — with a follow-up queue for quotes gone quiet.",
};

export default async function QuotesPage() {
  const user = await requireUser();
  const quotes = await store.listQuotes(user.id);
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-paper">Quotes</h2>
      <QuotesClient quotes={quotes} />
    </div>
  );
}
