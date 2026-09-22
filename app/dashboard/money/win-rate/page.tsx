import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import * as store from "@/lib/store";
import { formatUSD } from "@/lib/money";
import {
  buildWinRateReport,
  headlineInsight,
  MIN_SAMPLE,
  MIN_SPLIT_SAMPLE,
  type Rate,
  type SplitComparison,
} from "@/lib/winrate";
import MoneyTabs from "@/components/MoneyTabs";
import { IconChart, IconEye, IconLink, IconMoneyFound } from "@/components/icons";

export const metadata: Metadata = {
  title: "Win rate",
  description:
    "What you win, at what price, and whether a lost job was a pricing problem or a delivery problem.",
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** A rate, or an honest statement of how much more data it needs. */
function RateFigure({
  rate,
  min = MIN_SAMPLE,
  className = "",
}: {
  rate: Rate;
  min?: number;
  className?: string;
}) {
  if (rate.rate === null) {
    const needed = min - rate.n;
    return (
      <span className={`text-bone-500 ${className}`}>
        <span className="font-display text-2xl tracking-wide">—</span>
        <span className="ml-2 text-sm">
          {needed > 0
            ? `${needed} more decided quote${needed === 1 ? "" : "s"} needed`
            : "not enough data"}
        </span>
      </span>
    );
  }
  return (
    <span className={className}>
      <span className="font-display text-3xl tracking-wide text-safety-300">
        {pct(rate.rate)}
      </span>
      <span className="ml-2 text-sm text-bone-500">
        {rate.wins} of {rate.n}
      </span>
    </span>
  );
}

/** A two-sided comparison, shown only when both sides have a real sample. */
function Split({
  comparison,
  withLabel,
  withoutLabel,
  explain,
  pending,
}: {
  comparison: SplitComparison;
  withLabel: string;
  withoutLabel: string;
  explain: (delta: number) => string;
  pending: string;
}) {
  if (!comparison.available) {
    return <p className="mt-3 text-[15px] leading-relaxed text-bone-400">{pending}</p>;
  }
  const w = comparison.withRate.rate as number;
  const wo = comparison.withoutRate.rate as number;
  const delta = w - wo;

  return (
    <div className="mt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: withLabel, rate: comparison.withRate, value: w },
          { label: withoutLabel, rate: comparison.withoutRate, value: wo },
        ].map((side) => (
          <div key={side.label} className="well p-4">
            <p className="stat-label">{side.label}</p>
            <p className="mt-1.5 font-display text-3xl tracking-wide text-paper">
              {pct(side.value)}
            </p>
            <p className="mt-0.5 text-sm text-bone-500">
              {side.rate.wins} of {side.rate.n} decided
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-bone-300">{explain(delta)}</p>
    </div>
  );
}

export default async function WinRatePage() {
  const user = await requireUser();
  const quotes = await store.listQuotes(user.id);
  const report = buildWinRateReport(quotes);
  const insight = headlineInsight(report);

  const maxBandN = Math.max(1, ...report.bands.map((b) => b.rate.n));

  return (
    <div>
      <div className="flex items-start gap-4 md:mt-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
          <IconChart className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-3xl uppercase leading-tight tracking-wide text-paper sm:text-4xl">
            Win rate
          </h2>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-bone-300">
            Every quote you send is an experiment you never read the result of.
            Here it is — built only from your own decided quotes, with the
            sample size on every number.
          </p>
        </div>
      </div>

      <MoneyTabs />

      {report.decided === 0 ? (
        <div className="empty-state mt-6">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
            <IconChart className="h-7 w-7" />
          </span>
          <h3 className="mt-5 font-display text-2xl uppercase tracking-wide text-paper">
            No decided quotes yet
          </h3>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-bone-300">
            This screen needs quotes that reached a yes or a no.
            {report.open > 0
              ? ` You have ${report.open} still out — mark them accepted or declined as you hear back, and the numbers start here.`
              : " Send a few quotes and mark how they land."}
          </p>
          <Link href="/dashboard/quotes/new" className="btn-primary mt-6">
            Write a quote
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {/* Headline */}
          <div className="card overflow-hidden">
            <div className="hazard h-2" aria-hidden="true" />
            <div className="p-6 sm:p-8">
              <p className="stat-label">Overall win rate</p>
              <div className="mt-2">
                {report.overall.rate === null ? (
                  <>
                    <p className="font-display text-5xl leading-none tracking-wide text-bone-500">
                      —
                    </p>
                    <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bone-300">
                      {MIN_SAMPLE - report.overall.n} more decided quote
                      {MIN_SAMPLE - report.overall.n === 1 ? "" : "s"} and this
                      becomes a real number. Showing a percentage off{" "}
                      {report.overall.n} would be noise wearing a percent sign —
                      and you might price against it.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display text-6xl leading-none tracking-wide text-safety-300">
                      {pct(report.overall.rate)}
                    </p>
                    <p className="mt-3 text-[15px] text-bone-300">
                      {report.overall.wins} won, {report.overall.losses} lost
                      {report.open > 0 && `, ${report.open} still out`}.
                    </p>
                  </>
                )}
              </div>
              {insight && (
                <p className="mt-5 rounded-xl border-2 border-safety-500/40 bg-safety-500/[0.07] px-4 py-3.5 text-[15px] leading-relaxed text-safety-100">
                  {insight}
                </p>
              )}
            </div>
          </div>

          {/* Price bands */}
          <div className="card p-6 sm:p-8">
            <h3 className="font-display text-xl uppercase tracking-wide text-paper">
              Win rate by price
            </h3>
            <p className="mt-1.5 text-[15px] text-bone-400">
              Where your pricing stops landing. Bands with fewer than{" "}
              {MIN_SAMPLE} decided quotes show no rate.
            </p>
            <ul className="mt-5 space-y-4">
              {report.bands.map((b) => (
                <li key={b.label}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-bone-200">{b.label}</span>
                    <RateFigure rate={b.rate} />
                  </div>
                  {/* Bar length is the SAMPLE, fill is the win rate: a long
                      bar means "you quote a lot here", a full bar means "you
                      win here". Conflating the two would hide which bands the
                      rate can actually be trusted in. */}
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-ink-900">
                    <div
                      className="h-full rounded-full bg-ink-700"
                      style={{ width: `${(b.rate.n / maxBandN) * 100}%` }}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-safety-400 to-ember-500"
                        style={{
                          width: b.rate.rate === null ? "0%" : `${b.rate.rate * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  {b.medianWon > 0 && (
                    <p className="mt-1.5 text-sm text-bone-500">
                      Typical won job here: {formatUSD(b.medianWon)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Labor rate */}
          <div className="card p-6 sm:p-8">
            <h3 className="font-display text-xl uppercase tracking-wide text-paper">
              Your labor rate, won vs lost
            </h3>
            <p className="mt-1.5 text-[15px] text-bone-400">
              Labor dollars divided by labor quantity, in whatever unit you
              price in. Only ever compared against your own other quotes.
            </p>
            {report.labor.wonMedian !== null && report.labor.lostMedian !== null ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="well p-4">
                    <p className="stat-label">On quotes you won</p>
                    <p className="mt-1.5 font-display text-3xl tracking-wide text-money-300">
                      {formatUSD(report.labor.wonMedian)}
                    </p>
                    <p className="mt-0.5 text-sm text-bone-500">
                      median of {report.labor.wonN}
                    </p>
                  </div>
                  <div className="well p-4">
                    <p className="stat-label">On quotes you lost</p>
                    <p className="mt-1.5 font-display text-3xl tracking-wide text-alert-300">
                      {formatUSD(report.labor.lostMedian)}
                    </p>
                    <p className="mt-0.5 text-sm text-bone-500">
                      median of {report.labor.lostN}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
                  {report.labor.lostMedian > report.labor.wonMedian * 1.1
                    ? `You price labor about ${Math.round(((report.labor.lostMedian - report.labor.wonMedian) / report.labor.wonMedian) * 100)}% higher on the jobs you lose. That gap is the clearest pricing signal on this page.`
                    : report.labor.wonMedian > report.labor.lostMedian * 1.1
                    ? "You win at a higher labor rate than you lose at — price isn't what's costing you these jobs, so look at scope, speed of reply, or how the quote reads."
                    : "Your labor rate is close to identical on won and lost jobs, so price isn't the deciding factor. Look at response time and what the quote says."}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[15px] leading-relaxed text-bone-400">
                Needs at least {MIN_SPLIT_SAMPLE} won and {MIN_SPLIT_SAMPLE} lost
                quotes carrying labor lines. You have {report.labor.wonN} won and{" "}
                {report.labor.lostN} lost.
              </p>
            )}
          </div>

          {/* Delivery vs pricing */}
          <div className="card p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-grape-400/15 text-grape-300">
                <IconEye className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-xl uppercase tracking-wide text-paper">
                  Did they even open it?
                </h3>
                <p className="mt-1.5 text-[15px] text-bone-400">
                  A quote lost because the price was wrong and a quote lost
                  because it never got read need opposite fixes. Share links are
                  the only way to tell them apart.
                </p>
              </div>
            </div>

            {report.delivery.shared === 0 ? (
              <div className="mt-5 rounded-xl border-2 border-ink-600 bg-ink-900 p-5">
                <p className="text-[15px] leading-relaxed text-bone-300">
                  You haven&apos;t sent any quotes as share links yet, so
                  there&apos;s nothing to measure. Open a quote and hit{" "}
                  <span className="font-semibold text-paper">Share link</span> —
                  the customer taps accept or decline on their phone, and this
                  section starts filling in.
                </p>
                <Link href="/dashboard/quotes" className="btn-secondary mt-4">
                  <IconLink className="h-4 w-4" /> Go to quotes
                </Link>
              </div>
            ) : (
              <>
                <p className="mt-5 text-[15px] text-bone-300">
                  <span className="font-display text-3xl tracking-wide text-grape-300">
                    {report.delivery.opened}
                  </span>{" "}
                  of {report.delivery.shared} shared quote
                  {report.delivery.shared === 1 ? "" : "s"} opened.
                </p>
                <Split
                  comparison={report.delivery.comparison}
                  withLabel="Opened the link"
                  withoutLabel="Never opened it"
                  pending={`Needs ${MIN_SPLIT_SAMPLE} decided quotes on each side before the comparison means anything. Keep sending links.`}
                  explain={(delta) =>
                    delta > 0.15
                      ? "Quotes that get opened win far more often. The job now is getting the link opened — send it while you're still standing there, and follow up on the unopened ones first."
                      : delta < -0.15
                      ? "Opened quotes actually win less often, which points at the quote itself rather than delivery — the price or the scope is losing people once they read it."
                      : "Opening the link barely changes the outcome, so delivery isn't your bottleneck. The decision is being made on price and scope."
                  }
                />
              </>
            )}
          </div>

          {/* Follow-up effect */}
          <div className="card p-6 sm:p-8">
            <h3 className="font-display text-xl uppercase tracking-wide text-paper">
              Does following up work?
            </h3>
            <p className="mt-1.5 text-[15px] text-bone-400">
              Counted from the follow-ups you drafted here, against the quotes
              you never nudged.
            </p>
            <Split
              comparison={report.followup}
              withLabel="Followed up"
              withoutLabel="Never followed up"
              pending={`Needs ${MIN_SPLIT_SAMPLE} decided quotes on each side. Draft follow-ups from the briefing and this answers itself.`}
              explain={(delta) =>
                delta > 0.1
                  ? `Following up is worth ${pct(delta)} on your win rate. That is the cheapest money on this page — the briefing queues them for you every morning.`
                  : delta < -0.1
                  ? "Followed-up quotes win less often here — which usually means you only chase the shaky ones. Worth chasing the strong ones too before reading much into this."
                  : "Following up isn't moving your win rate much either way yet. Keep the sample growing before changing anything."
              }
            />
          </div>

          {/* Decline reasons */}
          {report.declineReasons.length > 0 && (
            <div className="card p-6 sm:p-8">
              <h3 className="font-display text-xl uppercase tracking-wide text-paper">
                What they said when they declined
              </h3>
              <p className="mt-1.5 text-[15px] text-bone-400">
                In your customers&apos; own words, from the public quote page.
              </p>
              <ul className="mt-5 space-y-2.5">
                {report.declineReasons.map((r) => (
                  <li key={r.reason} className="well flex items-start gap-3 p-4">
                    {r.count > 1 && (
                      <span className="badge border-alert-400/40 bg-alert-400/15 text-alert-300">
                        ×{r.count}
                      </span>
                    )}
                    <p className="text-[15px] leading-relaxed text-bone-200">
                      &ldquo;{r.reason}&rdquo;
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Link href="/dashboard/money" className="btn-secondary">
              <IconMoneyFound className="h-4 w-4" /> Back to money found
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
