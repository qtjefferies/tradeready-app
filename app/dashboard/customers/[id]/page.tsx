import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import CustomerDetail from "@/components/CustomerDetail";

export const metadata: Metadata = {
  title: "Customer",
  description: "Customer profile with full history: quotes, invoices, jobs, equipment, reviews.",
};

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [customer, history] = await Promise.all([
    store.getCustomer(user.id, id),
    store.getCustomerHistory(user.id, id),
  ]);
  if (!customer || !history) notFound();
  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold text-white">{customer.name}</h2>
      <CustomerDetail customer={customer} history={history} />
    </div>
  );
}
