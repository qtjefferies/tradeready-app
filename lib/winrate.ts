import { computeTotals } from "./money";
import type { Quote } from "./store";

/**
 * The win-rate engine.
 *
 * Every quote a contractor sends is an experiment they never read the result
 * of. This module reads it: what they win, at what price, and — once share
 * links are in use — whether a lost job was a pricing problem or a delivery
 * problem, which are opposite fixes and get confused constantly.
 *
 * ON SAMPLE SIZE: a rate computed from three quotes is noise wearing a
 * percent sign, and a contractor who repriced their business on it would be
 * worse off than before. Every figure here carries its `n`, and any rate
 * below MIN_SAMPLE is returned as null for the UI to render as "not enough
 * data yet" — never as a number.
 */

/** Below this many decided quotes, a rate is not reported at all. */
export const MIN_SAMPLE = 5;
/** A split comparison needs this many on EACH side to be worth showing. */
export const MIN_SPLIT_SAMPLE = 4;

export interface Rate {
  wins: number;
  losses: number;
  n: number;
  /** Win rate 0–1, or null when n < MIN_SAMPLE. */
  rate: number | null;
}

export interface Band {
  label: string;
  min: number;
  max: number;
  rate: Rate;
  /** Median value of the won quotes in this band, 0 when none. */
  medianWon: number;
}

export interface SplitComparison {
  /** Null until both sides clear MIN_SPLIT_SAMPLE. */
  available: boolean;
  withRate: Rate;
  withoutRate: Rate;
}

export interface WinRateReport {
  /** Quotes that reached a yes or a no. The denominator for everything. */
  decided: number;
  /** Still out: sent or viewed, no answer yet. */
  open: number;
  overall: Rate;
  bands: Band[];
  /** Typical labor rate on won vs lost quotes. Null sides lack a sample. */
  labor: {
    wonMedian: number | null;
    lostMedian: number | null;
    wonN: number;
    lostN: number;
  };
  /** Did they open the link? The pricing-vs-delivery diagnosis. */
  delivery: {
    /** Quotes that have a share link and were sent. */
    shared: number;
    opened: number;
    /** Win rate among quotes the customer actually opened vs. never opened. */
    comparison: SplitComparison;
  };
  /** Does following up win work? */
  followup: SplitComparison;
  /** Reasons customers gave when declining through the public page. */
  declineReasons: { reason: string; count: number }[];
}

const PRICE_BANDS: { label: string; min: number; max: number }[] = [
  { label: "Under $500", min: 0, max: 500 },
  { label: "$500 – $1.5k", min: 500, max: 1500 },
  { label: "$1.5k – $5k", min: 1500, max: 5000 },
  { label: "$5k – $15k", min: 5000, max: 15000 },
  { label: "$15k+", min: 15000, max: Infinity },
];

function median(ns: number[]): number {
  if (ns.length === 0) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function rateOf(wins: number, losses: number, min = MIN_SAMPLE): Rate {
  const n = wins + losses;
  return { wins, losses, n, rate: n >= min ? wins / n : null };
}

function splitOf(
  withSide: { wins: number; losses: number },
  withoutSide: { wins: number; losses: number }
): SplitComparison {
  const withRate = rateOf(withSide.wins, withSide.losses, MIN_SPLIT_SAMPLE);
  const withoutRate = rateOf(withoutSide.wins, withoutSide.losses, MIN_SPLIT_SAMPLE);
  return {
    available: withRate.rate !== null && withoutRate.rate !== null,
    withRate,
    withoutRate,
  };
}

const totalOf = (q: Quote) => computeTotals(q.line_items, q.tax_pct, q.discount).total;

/**
 * The quote's effective labor rate: total labor dollars over total labor
 * quantity. Quantity is whatever unit the contractor priced in — usually
 * hours — so this is "what one unit of my labor costs", compared only
 * against this same contractor's other quotes. It is never compared against
 * anyone else's, which is what would make the unit ambiguity a problem.
 */
function laborRate(q: Quote): number | null {
  const labor = q.line_items.filter((i) => i.kind === "labor" && i.qty > 0);
  if (labor.length === 0) return null;
  const qty = labor.reduce((s, i) => s + i.qty, 0);
  const dollars = labor.reduce((s, i) => s + i.qty * i.unit_price, 0);
  if (qty <= 0 || dollars <= 0) return null;
  return dollars / qty;
}

/** Build the full report from the user's quotes. Pure — no I/O. */
export function buildWinRateReport(quotes: Quote[]): WinRateReport {
  const won = quotes.filter((q) => q.status === "accepted");
  const lost = quotes.filter((q) => q.status === "declined");
  const open = quotes.filter((q) => q.status === "sent" || q.status === "viewed").length;

  // --- price bands ---
  const bands: Band[] = PRICE_BANDS.map((b) => {
    const inBand = (q: Quote) => {
      const t = totalOf(q);
      return t >= b.min && t < b.max;
    };
    const w = won.filter(inBand);
    const l = lost.filter(inBand);
    return {
      label: b.label,
      min: b.min,
      max: b.max,
      rate: rateOf(w.length, l.length),
      medianWon: median(w.map(totalOf)),
    };
  });

  // --- labor rate, won vs lost ---
  const wonRates = won.map(laborRate).filter((n): n is number => n !== null);
  const lostRates = lost.map(laborRate).filter((n): n is number => n !== null);

  // --- delivery: did the link ever get opened? ---
  //
  // Only quotes with a share link can answer this — a quote sent as a PDF
  // attachment leaves no trace either way, so counting it as "never opened"
  // would invent a delivery problem that may not exist.
  const shareable = quotes.filter((q) => q.public_token !== null && q.sent_at !== null);
  const opened = shareable.filter((q) => q.viewed_at !== null);
  const decidedOpened = { wins: 0, losses: 0 };
  const decidedUnopened = { wins: 0, losses: 0 };
  for (const q of shareable) {
    if (q.status !== "accepted" && q.status !== "declined") continue;
    const side = q.viewed_at !== null ? decidedOpened : decidedUnopened;
    if (q.status === "accepted") side.wins += 1;
    else side.losses += 1;
  }

  // --- follow-up effect ---
  const withFollowup = { wins: 0, losses: 0 };
  const withoutFollowup = { wins: 0, losses: 0 };
  for (const q of [...won, ...lost]) {
    const side = q.followup_count > 0 ? withFollowup : withoutFollowup;
    if (q.status === "accepted") side.wins += 1;
    else side.losses += 1;
  }

  // --- decline reasons customers typed themselves ---
  const reasonCounts = new Map<string, number>();
  for (const q of lost) {
    const r = q.decline_reason.trim();
    if (!r) continue;
    const key = r.slice(0, 120);
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  // Array.from rather than a spread: the project targets ES5 downlevel, where
  // spreading a Map iterator doesn't compile.
  const declineReasons = Array.from(reasonCounts, ([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    decided: won.length + lost.length,
    open,
    overall: rateOf(won.length, lost.length),
    bands,
    labor: {
      wonMedian: wonRates.length >= MIN_SPLIT_SAMPLE ? median(wonRates) : null,
      lostMedian: lostRates.length >= MIN_SPLIT_SAMPLE ? median(lostRates) : null,
      wonN: wonRates.length,
      lostN: lostRates.length,
    },
    delivery: {
      shared: shareable.length,
      opened: opened.length,
      comparison: splitOf(decidedOpened, decidedUnopened),
    },
    followup: splitOf(withFollowup, withoutFollowup),
    declineReasons,
  };
}

/**
 * The single most useful sentence the report can produce, or null when the
 * data doesn't support one. Deliberately conservative: it only speaks when a
 * band both clears the sample floor and differs from the overall rate by
 * enough to be worth acting on.
 */
export function headlineInsight(report: WinRateReport): string | null {
  if (report.overall.rate === null) return null;
  const overall = report.overall.rate;

  const scored = report.bands
    .filter((b) => b.rate.rate !== null)
    .map((b) => ({ band: b, delta: (b.rate.rate as number) - overall }));
  if (scored.length < 2) return null;

  const worst = scored.reduce((a, b) => (b.delta < a.delta ? b : a));
  const best = scored.reduce((a, b) => (b.delta > a.delta ? b : a));

  if (worst.delta <= -0.2) {
    return `Your win rate drops to ${Math.round((worst.band.rate.rate as number) * 100)}% on ${worst.band.label.toLowerCase()} jobs, against ${Math.round(overall * 100)}% overall (${worst.band.rate.n} decided). Worth a look at how you're pricing that range.`;
  }
  if (best.delta >= 0.2) {
    return `${best.band.label} jobs are your strongest range — ${Math.round((best.band.rate.rate as number) * 100)}% win rate against ${Math.round(overall * 100)}% overall (${best.band.rate.n} decided). More of those.`;
  }
  return null;
}
