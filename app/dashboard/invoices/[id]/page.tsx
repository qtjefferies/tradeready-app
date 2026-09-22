import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import InvoiceEditor from "@/components/InvoiceEditor";

export const metadata: Metadata = {
  title: "Invoice",
  description: "Edit your invoice.",
};

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [invoice, customers] = await Promise.all([
    store.getInvoice(user.id, id),
    store.listCustomers(user.id),
  ]);
  if (!invoice) notFound();
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-paper">
        Invoice #{invoice.id} — {invoice.title}
      </h2>
      <InvoiceEditor initial={invoice} customers={customers} seeded={null} />
    </div>
  );
}
