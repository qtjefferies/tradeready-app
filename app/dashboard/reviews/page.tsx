import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import ReviewsClient from "@/components/ReviewsClient";

export const metadata: Metadata = {
  title: "Reviews",
  description: "Ask for reviews after great jobs — and track who's delivered.",
};

export default async function ReviewsPage() {
  const user = await requireUser();
  const [reviews, customers, jobs] = await Promise.all([
    store.listReviews(user.id),
    store.listCustomers(user.id),
    store.listJobs(user.id),
  ]);
  const completeJobs = jobs.filter((j) => j.status === "complete");
  return (
    <div>
      <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-paper">Reviews</h2>
      <ReviewsClient reviews={reviews} customers={customers} completeJobs={completeJobs} />
    </div>
  );
}
