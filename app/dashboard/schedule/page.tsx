import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import ScheduleClient from "@/components/ScheduleClient";

export const metadata: Metadata = {
  title: "Schedule",
  description: "Your job schedule — today's jobs feed your morning briefing.",
};

export default async function SchedulePage() {
  const user = await requireUser();
  const [jobs, customers] = await Promise.all([
    store.listJobs(user.id),
    store.listCustomers(user.id),
  ]);
  return (
    <div>
      <h2 className="mb-6 font-display text-xl font-bold text-white">Schedule</h2>
      <ScheduleClient jobs={jobs} customers={customers} />
    </div>
  );
}
