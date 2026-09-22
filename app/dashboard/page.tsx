import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import { computeTotals, formatUSD } from "@/lib/money";
import { StatusBadge } from "@/components/Badges";
import {
  IconBriefing,
  IconClock,
  IconDollar,
  IconPlus,
  IconReviews,
  IconSchedule,
} from "@/components/icons";

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
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
          <IconBriefing className="h-7 w-7" />
        </span>
        <div>
          <h2 className="font-display text-3xl uppercase tracking-wide text-paper sm:text-4xl">
            Morning briefing
          </h2>
          <p className="mt-1.5 text-[15px] text-bone-300">
            {actionCount === 0
              ? "Nothing needs your attention. That's a good day."
              : `${actionCount} thing${actionCount === 1 ? "" : "s"} need${actionCount === 1 ? "s" : ""} your attention.`}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-safety-500/15 text-safety-300">
                <IconClock className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg uppercase tracking-wide text-paper">
                Follow up <span className="text-safety-400">({staleQuotes.length})</span>
              </h3>
            </div>
            <Link href="/dashboard/quotes" className="btn-ghost !min-h-[44px] !px-3">
              All quotes →
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            {staleQuotes.length === 0 ? (
              <p className="px-1 py-4 text-[15px] text-bone-500">No stale quotes. Every lead is warm.</p>
            ) : (
              <ul className="space-y-2.5">
                {staleQuotes.slice(0, 4).map((q) => (
                  <li key={q.id}>
                    <Link
                      href="/dashboard/quotes"
                      className="flex min-h-[64px] touch-manipulation items-center justify-between gap-3 rounded-xl border-2 border-safety-500/40 bg-safety-500/[0.07] px-4 py-3 transition active:scale-[0.99]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-bold text-paper">{q.title}</p>
                        <p className="mt-0.5 text-sm text-bone-400">
                          {q.customer_name || "No customer"} · sent{" "}
                          {q.sent_at ? new Date(q.sent_at).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <span className="shrink-0 font-display text-sm uppercase tracking-wide text-safety-300">Nudge →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-alert-400/15 text-alert-300">
                <IconDollar className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg uppercase tracking-wide text-paper">
                Money owed <span className="text-alert-300">({overdueInvoices.length})</span>
              </h3>
            </div>
            <Link href="/dashboard/invoices" className="btn-ghost !min-h-[44px] !px-3">
              All invoices →
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            {overdueInvoices.length === 0 ? (
              <p className="px-1 py-4 text-[15px] text-bone-500">Nobody owes you money. Beautiful.</p>
            ) : (
              <>
                <p className="px-1 pb-3">
                  <span className="font-display text-5xl leading-none text-alert-300">
                    {formatUSD(overdueTotal)}
                  </span>
                  <span className="stat-label ml-2">overdue</span>
                </p>
                <ul className="space-y-2.5">
                  {overdueInvoices.slice(0, 4).map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="flex min-h-[64px] touch-manipulation items-center justify-between gap-3 rounded-xl border-2 border-alert-400/40 bg-alert-400/[0.07] px-4 py-3 transition active:scale-[0.99]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-paper">
                            INV-{inv.id} · {inv.title}
                          </p>
                          <p className="mt-0.5 text-sm text-bone-400">
                            {inv.customer_name || "No customer"} ·{" "}
                            <span className="font-bold text-alert-300">
                              {formatUSD(computeTotals(inv.line_items, inv.tax_pct, inv.discount).total)}
                            </span>
                          </p>
                        </div>
                        <span className="shrink-0 font-display text-sm uppercase tracking-wide text-alert-300">Collect →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-400/15 text-info-300">
                <IconSchedule className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg uppercase tracking-wide text-paper">
                Today&apos;s jobs <span className="text-info-300">({todaysJobs.length})</span>
              </h3>
            </div>
            <Link href="/dashboard/schedule" className="btn-ghost !min-h-[44px] !px-3">
              Schedule →
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            {todaysJobs.length === 0 ? (
              <p className="px-1 py-4 text-[15px] text-bone-500">Nothing scheduled today. A clear board.</p>
            ) : (
              <ul className="space-y-2.5">
                {todaysJobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-paper">{j.title}</p>
                      <p className="mt-0.5 text-sm text-bone-400">
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
          </div>
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-grape-400/15 text-grape-300">
                <IconReviews className="h-5 w-5" />
              </span>
              <h3 className="font-display text-lg uppercase tracking-wide text-paper">
                Reviews to ask <span className="text-grape-300">({reviewsDue.length})</span>
              </h3>
            </div>
            <Link href="/dashboard/reviews" className="btn-ghost !min-h-[44px] !px-3">
              Reviews →
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            {reviewsDue.length === 0 ? (
              <p className="px-1 py-4 text-[15px] text-bone-500">Every completed job has a review ask logged.</p>
            ) : (
              <ul className="space-y-2.5">
                {reviewsDue.slice(0, 4).map((j) => (
                  <li
                    key={j.id}
                    className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-paper">{j.title}</p>
                      <p className="mt-0.5 text-sm text-bone-400">{j.customer_name}</p>
                    </div>
                    <Link
                      href="/dashboard/reviews"
                      className="shrink-0 font-display text-sm uppercase tracking-wide text-grape-300"
                    >
                      Ask →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <div className="sticky-actions mt-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/dashboard/quotes/new" className="btn-primary text-base">
            <IconPlus className="h-5 w-5" /> New quote
          </Link>
          <Link href="/dashboard/invoices/new" className="btn-secondary text-base">
            <IconPlus className="h-5 w-5" /> New invoice
          </Link>
          <Link href="/dashboard/schedule" className="btn-secondary text-base">
            <IconPlus className="h-5 w-5" /> Schedule a job
          </Link>
        </div>
      </div>
    </div>
  );
}
