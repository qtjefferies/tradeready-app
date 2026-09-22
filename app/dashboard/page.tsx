import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import { moneyFoundSummary } from "@/lib/opportunities";
import GettingStarted, { type SetupStep } from "@/components/GettingStarted";
import ToolQuoteNudge from "@/components/ToolQuoteNudge";
import { computeTotals, formatUSD } from "@/lib/money";
import { StatusBadge } from "@/components/Badges";
import {
  IconBriefing,
  IconClock,
  IconDollar,
  IconInvoice,
  IconMoneyFound,
  IconPlus,
  IconReviews,
  IconSchedule,
} from "@/components/icons";

/** Revenue bar chart geometry, in SVG user units (viewBox 0 0 600 280). */
const CHART = { x0: 56, x1: 584, y0: 30, y1: 246, slot: 88, bar: 54 };

/** Quote pipeline stages, in the order they flow. Colors match the palette. */
const PIPELINE_STAGES: { status: store.QuoteStatus; label: string; color: string }[] = [
  { status: "draft", label: "Draft", color: "#7b818b" },
  { status: "sent", label: "Sent", color: "#60a5fa" },
  { status: "viewed", label: "Viewed", color: "#a78bfa" },
  { status: "accepted", label: "Accepted", color: "#fbbf24" },
  { status: "declined", label: "Declined", color: "#f87171" },
];

/** Compact money for chart labels: "$1.8k" from a grand up, exact below. */
function compactUSD(n: number): string {
  if (Math.abs(n) < 1000) return formatUSD(n);
  return `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

/** Render a stored date-only value (YYYY-MM-DD) as the calendar day it names. */
function formatDay(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString();
}

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
  const [quotes, invoices, jobs, reviews, moneyFound, customers, settings] =
    await Promise.all([
      store.listQuotes(user.id),
      store.listInvoices(user.id),
      store.listJobs(user.id),
      store.listReviews(user.id),
      moneyFoundSummary(user.id),
      store.listCustomers(user.id),
      store.getSettings(user.id),
    ]);

  // --- first-run -----------------------------------------------------------
  //
  // A brand-new account has nothing to brief, and the empty states below read
  // as "this app is empty" rather than "you haven't started yet". Until a
  // quote exists, show the setup checklist instead.
  const profileReady = Boolean(
    settings?.businessName && settings.phone && settings.contactEmail
  );
  const sharedAQuote = quotes.some((q) => q.public_token !== null);
  const setupSteps: SetupStep[] = [
    {
      id: "profile",
      title: "Add your business details",
      body: "Phone, contact email and licence number — they print on every quote and invoice you send.",
      href: "/dashboard/settings",
      cta: "Set up",
      done: profileReady,
    },
    {
      id: "customer",
      title: "Add your first customer",
      body: "Name and number is enough. Everything else hangs off the customer record.",
      href: "/dashboard/customers",
      cta: "Add",
      done: customers.length > 0,
    },
    {
      id: "quote",
      title: "Write your first quote",
      body: "Describe the job in plain words and let the AI draft the line items.",
      href: "/dashboard/quotes/new",
      cta: "Write it",
      done: quotes.length > 0,
    },
    {
      id: "share",
      title: "Send it as a share link",
      body: "Your customer accepts with one tap, and you find out whether they ever opened it.",
      href: "/dashboard/quotes",
      cta: "Share",
      done: sharedAQuote,
    },
  ];
  const showSetup = setupSteps.some((s) => !s.done) && quotes.length === 0;

  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString();
  // 'viewed' belongs here as much as 'sent'. Now that a share link flips a
  // quote to 'viewed' on its own, matching only 'sent' would quietly drop
  // every quote the customer actually opened — which is the one you most
  // want to chase. (store.listStaleQuotes has always covered both.)
  const staleQuotes = quotes.filter(
    (q) =>
      (q.status === "sent" || q.status === "viewed") &&
      q.sent_at &&
      q.sent_at < twoDaysAgo
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

  // ---- Business pulse ----------------------------------------------------

  const totalOf = (d: store.Quote | store.Invoice) =>
    computeTotals(d.line_items, d.tax_pct, d.discount).total;

  // Revenue by calendar month, last six. `paid_at` and `created_at` both lead
  // with YYYY-MM-DD, so the bucket key is a slice — no timezone drift.
  const now = new Date();
  const monthBuckets = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
    };
  });
  const bucketByKey = new Map(monthBuckets.map((m) => [m.key, m]));
  for (const inv of invoices) {
    if (inv.status !== "paid") continue;
    const stamp = inv.paid_at ?? inv.created_at;
    const bucket = stamp ? bucketByKey.get(stamp.slice(0, 7)) : undefined;
    if (bucket) bucket.revenue += totalOf(inv);
  }
  const sixMonthRevenue = monthBuckets.reduce((s, m) => s + m.revenue, 0);
  const maxRevenue = Math.max(0, ...monthBuckets.map((m) => m.revenue));

  const pipeline = PIPELINE_STAGES.map((stage) => {
    const staged = quotes.filter((q) => q.status === stage.status);
    return {
      ...stage,
      count: staged.length,
      value: staged.reduce((s, q) => s + totalOf(q), 0),
    };
  });
  const pipelineTotal = pipeline.reduce((s, p) => s + p.value, 0);

  // Donut slices run clockwise from twelve o'clock: offset 25 rotates the
  // default 3-o'clock start a quarter turn back, then each slice starts where
  // the previous one ended.
  let sweptPct = 0;
  const donutSlices = pipeline
    .filter((p) => p.value > 0)
    .map((p) => {
      const pct = (p.value / pipelineTotal) * 100;
      const slice = { ...p, pct, dashOffset: 25 - sweptPct };
      sweptPct += pct;
      return slice;
    });

  const outstanding = invoices
    .filter(
      (inv) => inv.status === "unpaid" || inv.status === "sent" || inv.status === "overdue"
    )
    .sort((a, b) => {
      if (!a.due_at) return b.due_at ? 1 : 0;
      if (!b.due_at) return -1;
      return a.due_at.localeCompare(b.due_at);
    });
  const outstandingTotal = outstanding.reduce((s, inv) => s + totalOf(inv), 0);

  return (
    <div>
      {/* The nav tabs only join the flow at md: (they're bottom-fixed on
          mobile), so the clearance below them is a desktop-only concern. */}
      <div className="flex items-start gap-4 md:mt-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
          <IconBriefing className="h-7 w-7" />
        </span>
        <div>
          <h2 className="font-display text-3xl uppercase tracking-wide text-paper sm:text-4xl">
            Morning briefing
          </h2>
          <p className="mt-1.5 text-[15px] text-bone-300">
            {showSetup
              ? "Let's get you set up — it takes about five minutes."
              : actionCount === 0
              ? moneyFound.count > 0
                ? "Nothing urgent today — but there's money worth chasing below."
                : "Nothing needs your attention. That's a good day."
              : `${actionCount} thing${actionCount === 1 ? "" : "s"} need${actionCount === 1 ? "s" : ""} your attention.`}
          </p>
        </div>
      </div>

      {/* A free-calculator payload waiting from before login — the keep-them loop. */}
      <ToolQuoteNudge />

      {showSetup && (
        <div className="mt-6">
          <GettingStarted steps={setupSteps} />
        </div>
      )}

      {/* Money found — the one thing on this screen that isn't a chore.
          Shown only when there's something to show, and only ever with the
          evidenced figure: a headline number the contractor can't act on
          would train them to ignore the banner. */}
      {moneyFound.count > 0 && (
        <Link
          href="/dashboard/money"
          className="card mt-6 block overflow-hidden transition hover:border-money-400/40 active:scale-[0.995]"
        >
          <div className="flex items-center gap-4 p-5 sm:p-6">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-money-400/15 text-money-300">
              <IconMoneyFound className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="stat-label">Money found</p>
              <p className="mt-1 font-display text-2xl tracking-wide text-money-300 sm:text-3xl">
                {formatUSD(moneyFound.total)}
                <span className="ml-2 text-[15px] font-sans font-semibold tracking-normal text-bone-400">
                  across {moneyFound.count} opportunit{moneyFound.count === 1 ? "y" : "ies"}
                </span>
              </p>
              <p className="mt-1 text-sm text-bone-400">
                Already in your records — unbilled work, aging installs, quiet customers.
              </p>
            </div>
            <span className="shrink-0 font-display text-sm uppercase tracking-wide text-money-300">
              Open →
            </span>
          </div>
        </Link>
      )}

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

      <div className="mt-10 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
          <IconDollar className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-display text-2xl uppercase tracking-wide text-paper sm:text-3xl">
            Business pulse
          </h2>
          <p className="mt-1 text-[15px] text-bone-300">
            Where the money came from, what&apos;s still in play, and who still owes you.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-5">
        <section className="card overflow-hidden lg:col-span-3">
          <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-5 sm:p-6">
            <div>
              <h3 className="font-display text-lg uppercase tracking-wide text-paper">
                Revenue
              </h3>
              <p className="mt-0.5 text-sm text-bone-400">Paid invoices, last 6 months</p>
            </div>
            <p className="shrink-0 text-right">
              <span className="font-display text-3xl leading-none text-money-300">
                {formatUSD(sixMonthRevenue)}
              </span>
              <span className="stat-label mt-1.5 mb-0 block">6-month total</span>
            </p>
          </div>
          <div className="p-4 sm:p-5">
            {sixMonthRevenue === 0 ? (
              <p className="px-1 py-12 text-center text-[15px] text-bone-500">
                No invoices marked paid yet. The first one starts this chart.
              </p>
            ) : (
              <svg
                viewBox="0 0 600 280"
                className="w-full"
                role="img"
                aria-label={`Revenue from paid invoices over the last six months, ${formatUSD(sixMonthRevenue)} total`}
              >
                <defs>
                  <linearGradient id="pulse-bar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                {[0, 0.5, 1].map((frac) => {
                  const y = CHART.y1 - frac * (CHART.y1 - CHART.y0);
                  return (
                    <g key={frac}>
                      <line
                        x1={CHART.x0}
                        y1={y}
                        x2={CHART.x1}
                        y2={y}
                        stroke="#272c36"
                        strokeWidth={1}
                      />
                      <text
                        x={CHART.x0 - 12}
                        y={y + 4}
                        textAnchor="end"
                        fontSize={13}
                        className="fill-bone-500"
                      >
                        {compactUSD(maxRevenue * frac)}
                      </text>
                    </g>
                  );
                })}

                {monthBuckets.map((m, i) => {
                  const height =
                    maxRevenue > 0 ? (m.revenue / maxRevenue) * (CHART.y1 - CHART.y0) : 0;
                  const x = CHART.x0 + i * CHART.slot + (CHART.slot - CHART.bar) / 2;
                  const y = CHART.y1 - height;
                  return (
                    <g key={m.key}>
                      <title>{`${m.label} — ${formatUSD(m.revenue)}`}</title>
                      {height > 0 && (
                        <rect
                          x={x}
                          y={y}
                          width={CHART.bar}
                          height={height}
                          rx={6}
                          fill="url(#pulse-bar)"
                        />
                      )}
                      <text
                        x={x + CHART.bar / 2}
                        y={y - 10}
                        textAnchor="middle"
                        fontSize={13}
                        className="fill-bone-300 font-bold"
                      >
                        {compactUSD(m.revenue)}
                      </text>
                      <text
                        x={x + CHART.bar / 2}
                        y={270}
                        textAnchor="middle"
                        fontSize={14}
                        letterSpacing="0.08em"
                        className="fill-bone-400 font-display uppercase"
                      >
                        {m.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </section>

        <section className="card overflow-hidden lg:col-span-2">
          <div className="border-b border-ink-700 p-5 sm:p-6">
            <h3 className="font-display text-lg uppercase tracking-wide text-paper">
              Quote pipeline
            </h3>
            <p className="mt-0.5 text-sm text-bone-400">Quoted value by stage</p>
          </div>
          <div className="p-4 sm:p-5">
            {pipelineTotal === 0 ? (
              <p className="px-1 py-12 text-center text-[15px] text-bone-500">
                No quotes on the board. Write one and it shows up here.
              </p>
            ) : (
              <>
                <svg
                  viewBox="0 0 200 200"
                  className="mx-auto w-full max-w-[220px]"
                  role="img"
                  aria-label={`Quote pipeline, ${formatUSD(pipelineTotal)} in play`}
                >
                  {donutSlices.map((slice) => (
                    <circle
                      key={slice.status}
                      cx={100}
                      cy={100}
                      r={70}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={30}
                      pathLength={100}
                      strokeDasharray={`${slice.pct} 100`}
                      strokeDashoffset={slice.dashOffset}
                    >
                      <title>{`${slice.label} — ${slice.count} quote${slice.count === 1 ? "" : "s"} · ${formatUSD(slice.value)}`}</title>
                    </circle>
                  ))}
                  <text
                    x={100}
                    y={98}
                    textAnchor="middle"
                    fontSize={26}
                    className="fill-paper font-display"
                  >
                    {compactUSD(pipelineTotal)}
                  </text>
                  <text
                    x={100}
                    y={119}
                    textAnchor="middle"
                    fontSize={11}
                    letterSpacing="0.16em"
                    className="fill-bone-500 font-bold"
                  >
                    IN PLAY
                  </text>
                </svg>

                <ul className="mt-5 space-y-2.5">
                  {pipeline.map((stage) => (
                    <li key={stage.status} className="flex items-center gap-2.5 text-sm">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="font-display uppercase tracking-wide text-bone-300">
                        {stage.label}
                      </span>
                      <span className="text-bone-500">{stage.count}</span>
                      <span className="ml-auto font-bold text-paper">
                        {formatUSD(stage.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-ink-700 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alert-400/15 text-alert-300">
              <IconInvoice className="h-5 w-5" />
            </span>
            <h3 className="font-display text-lg uppercase tracking-wide text-paper">
              Outstanding
            </h3>
            <span className="badge shrink-0 border-alert-400/40 bg-alert-400/15 text-alert-300">
              {outstanding.length}
            </span>
          </div>
          <p className="shrink-0 text-right">
            <span className="font-display text-2xl leading-none text-alert-300">
              {formatUSD(outstandingTotal)}
            </span>
            <span className="stat-label mt-1.5 mb-0 block">awaiting payment</span>
          </p>
        </div>
        {outstanding.length === 0 ? (
          <p className="px-6 py-10 text-center text-[15px] text-bone-500">
            Every invoice is settled. Nothing left to chase.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-ink-700">
                  <th className="px-5 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-bone-400 sm:px-6">
                    Invoice
                  </th>
                  <th className="px-5 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-bone-400 sm:px-6">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-bone-400 sm:px-6">
                    Due
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-bold uppercase tracking-[0.12em] text-bone-400 sm:px-6">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right text-[12px] font-bold uppercase tracking-[0.12em] text-bone-400 sm:px-6">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {outstanding.map((inv) => (
                  <tr key={inv.id} className="border-b border-ink-700 last:border-0">
                    <td className="px-5 py-3.5 sm:px-6">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="font-bold text-paper transition hover:text-safety-300"
                      >
                        INV-{inv.id} · {inv.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-bone-400 sm:px-6">
                      {inv.customer_name || "No customer"}
                    </td>
                    <td className="px-5 py-3.5 text-bone-400 sm:px-6">
                      {inv.due_at ? formatDay(inv.due_at) : "No due date"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-paper sm:px-6">
                      {formatUSD(totalOf(inv))}
                    </td>
                    <td className="px-5 py-3.5 text-right sm:px-6">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
