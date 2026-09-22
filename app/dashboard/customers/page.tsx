import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import CustomersClient from "@/components/CustomersClient";

export const metadata: Metadata = {
  title: "Customers",
  description: "Your customer list — every customer keeps their full job history.",
};

export default async function CustomersPage() {
  const user = await requireUser();
  const customers = await store.listCustomers(user.id);
  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold text-white">Customers</h2>
      <CustomersClient customers={customers} />
    </div>
  );
}
