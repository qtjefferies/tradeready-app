import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import InvoicesClient from "@/components/InvoicesClient";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Your invoices — with a payment-reminder queue for overdue ones.",
};

export default async function InvoicesPage() {
  const user = await requireUser();
  const invoices = await store.listInvoices(user.id);
  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold text-white">Invoices</h2>
      <InvoicesClient invoices={invoices} />
    </div>
  );
}
