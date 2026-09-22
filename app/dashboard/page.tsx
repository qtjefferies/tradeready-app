import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import { computeTotals, formatUSD } from "@/lib/money";
import { StatusBadge } from "@/components/Badges";

export const metadata: Metadata = {
  title: "Morning briefing",
  description: "Your daily briefing: quotes to follow up, invoices past due, today's jobs, and reviews to ask for.",
};

/**
 * Morning briefing — the daily habit screen.
 * - Quotes sent 2+ days ago with no reply
 * - Overdue invoices
 * - Today's jobs
 * - Completed jobs with no review request logged
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const [quotes, invoices, jobs, reviews] = await Promise.all([
    store.listQuotes(user.id),
    store.listInvoices(user.id),
    store.listJobs(user.id),
    store.listReviews(user.id),
  ]);

  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const staleQuotes = quotes.filter(
    (q) => q.status === "sent" && q.sent_at && q.sent_at < twoDaysAgo
  );

  const today = new Date().toISOString().slice(0, 10);
  const overdueInvoices = invoices.filter(
    (inv) =>
      inv.status === "overdue" ||
      ((inv.status === "unpaid" || inv.status === "sent") &&
        inv.due_at !== null &&
        inv.due_at < today)
  );
  const overdueTotal = overdueInvoices.reduce(
    (s, i) => s + computeTotals(i.line_items, i.tax_pct, i.discount).total,
    0
  );

  const todaysJobs = jobs.filter(
    (j) =>
      j.status !== "complete" &&
      j.status !== "cancelled" &&
      j.scheduled_at &&
      new Date(j.scheduled_at).toISOString().slice(0, 10) === today
  );

  const completeJobs = jobs.filter((j) => j.status === "complete");
  const reviewedJobIds = new Set(reviews.map((r) => r.job_id).filter(Boolean));
  const reviewsDue = completeJobs.filter((j) => j.id && !reviewedJobIds.has(j.id));

  const actionCount =
    staleQuotes.length + overdueInvoices.length + todaysJobs.length + reviewsDue.length;

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-white">
        Good morning{user.businessName ? `, ${user.businessName}` : ""} ☀️
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {actionCount === 0
          ? "Nothing needs your attention. That's a good day."
          : `${actionCount} thing${actionCount === 1 ? "" : "s"} need${actionCount === 1 ? "s" : ""} your attention.`}
      </p>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              Quotes to follow up ({staleQuotes.length})
            </h3>
            <Link href="/dashboard/quotes" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
              All quotes →
            </Link>
          </div>
          {staleQuotes.length === 0 ? (
            <p className="text-sm text-slate-500">No stale quotes. Every lead is warm.</p>
          ) : (
            <ul className="space-y-2">
              {staleQuotes.slice(0, 4).map((q) => (
                <li key={q.id}>
                  <Link
                    href="/dashboard/quotes"
                    className="block rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-amber-400/40"
                  >
                    <p className="truncate text-sm font-semibold text-white">{q.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {q.customer_name || "No customer"} · sent{" "}
                      {q.sent_at ? new Date(q.sent_at).toLocaleDateString() : "—"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              Money waiting on you ({overdueInvoices.length})
            </h3>
            <Link href="/dashboard/invoices" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
              All invoices →
            </Link>
          </div>
          {overdueInvoices.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody owes you money. Beautiful.</p>
          ) : (
            <>
              <p className="mb-3 font-display text-2xl font-bold text-red-300">
                {formatUSD(overdueTotal)} <span className="text-sm font-normal text-slate-400">overdue</span>
              </p>
              <ul className="space-y-2">
                {overdueInvoices.slice(0, 4).map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="block rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-amber-400/40"
                    >
                      <p className="truncate text-sm font-semibold text-white">
                        INV-{inv.id} · {inv.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {inv.customer_name || "No customer"} ·{" "}
                        {formatUSD(computeTotals(inv.line_items, inv.tax_pct, inv.discount).total)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              Today&apos;s jobs ({todaysJobs.length})
            </h3>
            <Link href="/dashboard/schedule" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
              Schedule →
            </Link>
          </div>
          {todaysJobs.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing scheduled today. A clear board.</p>
          ) : (
            <ul className="space-y-2">
              {todaysJobs.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{j.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {j.customer_name}
                      {j.scheduled_at &&
                        ` · ${new Date(j.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <StatusBadge status={j.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-white">
              Reviews to ask for ({reviewsDue.length})
            </h3>
            <Link href="/dashboard/reviews" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
              Reviews →
            </Link>
          </div>
          {reviewsDue.length === 0 ? (
            <p className="text-sm text-slate-500">Every completed job has a review ask logged.</p>
          ) : (
            <ul className="space-y-2">
              {reviewsDue.slice(0, 4).map((j) => (
                <li
                  key={j.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <p className="truncate text-sm font-semibold text-white">{j.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{j.customer_name}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/quotes/new" className="btn-primary text-center text-sm">
          + New quote
        </Link>
        <Link href="/dashboard/invoices/new" className="btn-secondary text-center text-sm">
          + New invoice
        </Link>
        <Link href="/dashboard/schedule" className="btn-secondary text-center text-sm">
          + Schedule a job
        </Link>
      </div>
    </div>
  );
}
