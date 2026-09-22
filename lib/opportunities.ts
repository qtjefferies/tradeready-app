import { computeTotals } from "./money";
import { ageInYears, lifespanFor } from "./lifespans";
import * as store from "./store";

/**
 * The money engine — "Money Found".
 *
 * Every other screen in TradeReady shows work the contractor already knows
 * about. This one goes the other way: it reads the records they have already
 * entered and finds revenue sitting in them unclaimed. Four sources:
 *
 *   unbilled  — an accepted quote that never became an invoice. Work that was
 *               very likely done and never billed. The purest free money here.
 *   equipment — an install old enough that a replacement call is reasonable.
 *   dormant   — a customer with real spend history who hasn't been seen in a
 *               year.
 *   declined  — a quote turned down long enough ago that circumstances have
 *               probably changed.
 *
 * ON DOLLAR FIGURES: a number here is only ever shown when the contractor's
 * own records support it, and `basis` always says where it came from. An
 * opportunity we cannot price carries `value: null` and is left out of the
 * headline total rather than filled in with a market guess. A tool that
 * inflates "money found" to look impressive is worth less than no tool.
 */

export type OpportunityKind = "unbilled" | "equipment" | "dormant" | "declined";

export interface Opportunity {
  kind: OpportunityKind;
  /** Stable React key, unique across kinds. */
  key: string;
  customerId: number | null;
  customerName: string;
  /** Headline, e.g. "Water heater — 11 years old". */
  title: string;
  /** Supporting line under the headline. */
  detail: string;
  /** Dollars, ONLY when the user's own records support it. */
  value: number | null;
  /** Plain-words provenance for `value`, shown verbatim in the UI. */
  basis: string;
  /** How many of the user's own records `value` averages over, if averaged. */
  sampleSize: number | null;
  /** Primary action link, when the action is a navigation. */
  href: string | null;
  /** Context for the AI outreach drafter. Null for kinds with no outreach. */
  outreach: OutreachContext | null;
  /** Sort key — bigger is more urgent. */
  weight: number;
}

export interface OutreachContext {
  kind: Exclude<OpportunityKind, "unbilled">;
  customerName: string;
  /** What the message is about, e.g. "water heater" or "deck rebuild". */
  subject: string;
  /** Years since install / last job / the declined quote. */
  yearsAgo: number;
}

export interface MoneyFound {
  opportunities: Opportunity[];
  /** Sum of the evidenced values only. Never includes a guess. */
  evidencedTotal: number;
  /** Rows we found but could not price from the user's own history. */
  unpricedCount: number;
  byKind: Record<OpportunityKind, { count: number; value: number }>;
}

/** A customer is dormant after this long with no quote, invoice, or job. */
const DORMANT_MONTHS = 12;
/** A declined quote is worth revisiting after this long. */
const DECLINED_DAYS = 90;
/**
 * Start the replacement conversation this many years BEFORE typical end of
 * life — the sale happens while the unit still works, not after it floods a
 * basement.
 */
const REPLACEMENT_LEAD_YEARS = 2;

const DAY_MS = 86_400_000;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / DAY_MS);
}

/** Median, not mean: one $14k outlier shouldn't set the expectation. */
function median(ns: number[]): number {
  if (ns.length === 0) return 0;
  const s = [...ns].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

const totalOf = (d: { line_items: Parameters<typeof computeTotals>[0]; tax_pct: number; discount: number }) =>
  computeTotals(d.line_items, d.tax_pct, d.discount).total;

/**
 * What this contractor has actually charged for this kind of work, from their
 * own accepted quotes and paid invoices. Two matching jobs is the floor —
 * below that it is an anecdote, not a price, and the caller shows no figure.
 *
 * ONE JOB, ONE VOTE: an accepted quote that was then invoiced is the same
 * piece of work recorded twice. Counting both would double every sample size
 * on this screen — "6 past water heater jobs" off three real ones — and the
 * whole point of showing `n` is that it can be trusted. The invoice wins
 * where both exist, because it is what was actually billed.
 */
function priceFromHistory(
  keywords: string[],
  quotes: store.Quote[],
  invoices: store.Invoice[],
  invoicedQuoteIds: Set<number>
): { value: number; sampleSize: number } | null {
  const hit = (title: string) => {
    const t = title.toLowerCase();
    return keywords.some((k) => t.includes(k));
  };
  const totals = [
    ...quotes
      .filter((q) => q.status === "accepted" && !invoicedQuoteIds.has(q.id) && hit(q.title))
      .map(totalOf),
    ...invoices.filter((i) => i.status === "paid" && hit(i.title)).map(totalOf),
  ].filter((n) => n > 0);

  if (totals.length < 2) return null;
  return { value: median(totals), sampleSize: totals.length };
}

/**
 * Scan everything the user has entered and return what's worth chasing,
 * most urgent first.
 */
export async function findOpportunities(userId: number): Promise<MoneyFound> {
  const [quotes, invoices, jobs, customers, equipment] = await Promise.all([
    store.listQuotes(userId),
    store.listInvoices(userId),
    store.listJobs(userId),
    store.listCustomers(userId),
    store.listAllEquipment(userId),
  ]);

  const out: Opportunity[] = [];

  // --- 1. Accepted quotes that never became an invoice ------------------
  //
  // The quote total is exact — it is the number the customer already agreed
  // to — so this is the one kind that never needs an estimate.
  const invoicedQuoteIds = new Set(
    invoices.map((i) => i.quote_id).filter((id): id is number => id !== null)
  );
  for (const q of quotes) {
    if (q.status !== "accepted" || invoicedQuoteIds.has(q.id)) continue;
    const total = totalOf(q);
    if (total <= 0) continue;
    const age = daysSince(q.responded_at ?? q.updated_at) ?? 0;
    out.push({
      kind: "unbilled",
      key: `unbilled:${q.id}`,
      customerId: q.customer_id,
      customerName: q.customer_name,
      title: q.title,
      detail: `Accepted ${age === 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`} — no invoice raised yet.`,
      value: total,
      basis: "The accepted quote total.",
      sampleSize: null,
      href: `/dashboard/invoices/new?fromQuote=${q.id}`,
      outreach: null,
      // Unbilled work outranks everything: it is already earned.
      weight: 1_000_000 + total,
    });
  }

  // --- 2. Equipment approaching end of service life ---------------------
  const equipmentCustomerIds = new Set<number>();
  for (const e of equipment) {
    const life = lifespanFor(e.description);
    if (!life) continue;
    const age = ageInYears(e.installed_at);
    if (age === null || age < life.years - REPLACEMENT_LEAD_YEARS) continue;

    const priced = priceFromHistory(life.match, quotes, invoices, invoicedQuoteIds);
    const overdue = age >= life.years;
    equipmentCustomerIds.add(e.customer_id);
    out.push({
      kind: "equipment",
      key: `equipment:${e.id}`,
      customerId: e.customer_id,
      customerName: e.customer_name,
      title: `${e.description} — ${age} year${age === 1 ? "" : "s"} old`,
      detail: overdue
        ? `Past the ${life.years}-year mark for a ${life.label}. Worth a replacement call.`
        : `Approaching the ${life.years}-year mark for a ${life.label}.`,
      value: priced?.value ?? null,
      basis: priced
        ? `Median of your own ${priced.sampleSize} past ${life.label} jobs.`
        : `No past ${life.label} job on record to price from — quote it yourself.`,
      sampleSize: priced?.sampleSize ?? null,
      href: e.customer_id ? `/dashboard/customers/${e.customer_id}` : null,
      outreach: {
        kind: "equipment",
        customerName: e.customer_name,
        subject: e.description,
        yearsAgo: age,
      },
      weight: 100_000 + age * 100 + (priced?.value ?? 0) / 1000,
    });
  }

  // --- 3. Dormant customers with real spend history ---------------------
  //
  // Only customers who have actually paid before: a name entered once and
  // never billed is not a lapsed relationship, it's an empty row. Anyone
  // already surfaced above by their aging equipment is skipped — the
  // equipment is the better reason to call, and one customer should not
  // appear twice in the same list.
  const lastTouch = new Map<number, string>();
  const bump = (cid: number | null, stamp: string | null) => {
    if (cid === null || !stamp) return;
    const prev = lastTouch.get(cid);
    if (!prev || stamp > prev) lastTouch.set(cid, stamp);
  };
  for (const q of quotes) bump(q.customer_id, q.created_at);
  for (const i of invoices) bump(i.customer_id, i.created_at);
  for (const j of jobs) bump(j.customer_id, j.scheduled_at ?? j.created_at);

  const paidByCustomer = new Map<number, number[]>();
  for (const i of invoices) {
    if (i.status !== "paid" || i.customer_id === null) continue;
    const t = totalOf(i);
    if (t <= 0) continue;
    const list = paidByCustomer.get(i.customer_id) ?? [];
    list.push(t);
    paidByCustomer.set(i.customer_id, list);
  }

  const dormantCutoffDays = DORMANT_MONTHS * 30;
  for (const c of customers) {
    if (equipmentCustomerIds.has(c.id)) continue;
    const paid = paidByCustomer.get(c.id);
    if (!paid || paid.length === 0) continue;
    const since = daysSince(lastTouch.get(c.id) ?? null);
    if (since === null || since < dormantCutoffDays) continue;

    const years = Math.floor(since / 365);
    out.push({
      kind: "dormant",
      key: `dormant:${c.id}`,
      customerId: c.id,
      customerName: c.name,
      title: c.name,
      detail: `No quote, invoice, or job in ${Math.floor(since / 30)} months. ${paid.length} paid job${paid.length === 1 ? "" : "s"} on record.`,
      value: median(paid),
      basis: `Median of the ${paid.length} invoice${paid.length === 1 ? "" : "s"} they've already paid you.`,
      sampleSize: paid.length,
      href: `/dashboard/customers/${c.id}`,
      outreach: {
        kind: "dormant",
        customerName: c.name,
        subject: "checking in",
        yearsAgo: Math.max(1, years),
      },
      weight: 10_000 + median(paid) / 100 + since / 10,
    });
  }

  // --- 4. Quotes declined long enough ago to be worth re-asking ---------
  for (const q of quotes) {
    if (q.status !== "declined") continue;
    const since = daysSince(q.responded_at ?? q.updated_at);
    if (since === null || since < DECLINED_DAYS) continue;
    const total = totalOf(q);
    if (total <= 0) continue;

    out.push({
      kind: "declined",
      key: `declined:${q.id}`,
      customerId: q.customer_id,
      customerName: q.customer_name,
      title: q.title,
      detail: q.decline_reason
        ? `Declined ${Math.floor(since / 30)} months ago — "${q.decline_reason}"`
        : `Declined ${Math.floor(since / 30)} months ago. Budgets and priorities move.`,
      value: total,
      basis: "What you quoted at the time.",
      sampleSize: null,
      href: `/dashboard/quotes/${q.id}`,
      outreach: {
        kind: "declined",
        customerName: q.customer_name,
        subject: q.title,
        yearsAgo: Math.max(0, Math.floor(since / 365)),
      },
      weight: 1_000 + total / 100,
    });
  }

  out.sort((a, b) => b.weight - a.weight);

  const byKind: MoneyFound["byKind"] = {
    unbilled: { count: 0, value: 0 },
    equipment: { count: 0, value: 0 },
    dormant: { count: 0, value: 0 },
    declined: { count: 0, value: 0 },
  };
  let evidencedTotal = 0;
  let unpricedCount = 0;
  for (const o of out) {
    byKind[o.kind].count += 1;
    if (o.value === null) {
      unpricedCount += 1;
      continue;
    }
    byKind[o.kind].value += o.value;
    evidencedTotal += o.value;
  }

  return {
    opportunities: out,
    evidencedTotal: Math.round(evidencedTotal * 100) / 100,
    unpricedCount,
    byKind,
  };
}

/**
 * The headline figure for the briefing, without loading the whole list into
 * the dashboard's render. Same engine, same honesty rules.
 */
export async function moneyFoundSummary(
  userId: number
): Promise<{ total: number; count: number }> {
  const found = await findOpportunities(userId);
  return { total: found.evidencedTotal, count: found.opportunities.length };
}
