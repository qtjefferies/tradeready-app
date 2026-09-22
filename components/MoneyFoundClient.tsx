"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MessageModal from "./MessageModal";
import { formatUSD } from "@/lib/money";
import type { MoneyFound, Opportunity, OpportunityKind } from "@/lib/opportunities";
import { IconClock, IconDollar, IconSparkle, IconWrench } from "./icons";

/**
 * Money Found — the list of revenue already sitting in the contractor's own
 * records, with a drafted message ready for each one.
 *
 * Every row states where its dollar figure came from. Rows we can't price
 * from the user's own history say so and are excluded from the header total:
 * an inflated "money found" number would be the fastest way to make this
 * screen worthless.
 */

const KIND_META: Record<
  OpportunityKind,
  { label: string; blurb: string; accent: string; dot: string }
> = {
  unbilled: {
    label: "Unbilled work",
    blurb: "Accepted quotes that never became an invoice.",
    accent: "border-money-400/40 bg-money-400/10 text-money-300",
    dot: "bg-money-400",
  },
  equipment: {
    label: "Aging equipment",
    blurb: "Installs old enough to be worth a replacement call.",
    accent: "border-safety-500/40 bg-safety-500/10 text-safety-300",
    dot: "bg-safety-400",
  },
  dormant: {
    label: "Dormant customers",
    blurb: "People who paid you before and haven't been back.",
    accent: "border-info-400/40 bg-info-400/10 text-info-300",
    dot: "bg-info-400",
  },
  declined: {
    label: "Old declines",
    blurb: "Quotes turned down long enough ago that things may have changed.",
    accent: "border-grape-400/40 bg-grape-400/10 text-grape-300",
    dot: "bg-grape-400",
  },
};

const FILTERS: { value: OpportunityKind | "all"; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "unbilled", label: "Unbilled" },
  { value: "equipment", label: "Equipment" },
  { value: "dormant", label: "Dormant" },
  { value: "declined", label: "Declines" },
];

export default function MoneyFoundClient({ found }: { found: MoneyFound }) {
  const [filter, setFilter] = useState<OpportunityKind | "all">("all");
  const [drafting, setDrafting] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; subtitle: string; message: string } | null>(
    null
  );
  const [error, setError] = useState("");

  const shown = useMemo(
    () =>
      filter === "all"
        ? found.opportunities
        : found.opportunities.filter((o) => o.kind === filter),
    [filter, found.opportunities]
  );

  async function draftMessage(o: Opportunity) {
    if (!o.outreach) return;
    setDrafting(o.key);
    setError("");
    try {
      const res = await fetch("/api/ai/reactivation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: o.outreach.kind,
          customer_name: o.outreach.customerName,
          subject: o.outreach.subject,
          years_ago: o.outreach.yearsAgo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || "The AI couldn't draft that right now.");
        return;
      }
      setDraft({
        title: "Reach out",
        subtitle: `${o.customerName} — ${o.title}`,
        message: data.message,
      });
    } catch {
      setError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setDrafting(null);
    }
  }

  if (found.opportunities.length === 0) {
    return (
      <div className="empty-state">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-money-400/15 text-money-300">
          <IconDollar className="h-7 w-7" />
        </span>
        <h3 className="mt-5 font-display text-2xl uppercase tracking-wide text-paper">
          Nothing left on the table
        </h3>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-bone-300">
          Every accepted quote is invoiced, no install is near end of life, and
          no past customer has gone quiet. This screen fills itself as you log
          work — the more history you keep, the more it finds.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Headline */}
      <div className="card overflow-hidden">
        <div className="hazard h-2" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <p className="stat-label">On the table right now</p>
          <p className="mt-2 font-display text-5xl leading-none tracking-wide text-money-300 sm:text-6xl">
            {formatUSD(found.evidencedTotal)}
          </p>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-bone-300">
            Across {found.opportunities.length} opportunit
            {found.opportunities.length === 1 ? "y" : "ies"} already in your
            records. Every figure comes from your own quotes and invoices —
            each row says which.
            {found.unpricedCount > 0 && (
              <>
                {" "}
                {found.unpricedCount} more{" "}
                {found.unpricedCount === 1 ? "is" : "are"} worth chasing but
                left out of that total, because you have no past job of that
                type to price from.
              </>
            )}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(KIND_META) as OpportunityKind[]).map((k) => (
              <div key={k} className="well p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${KIND_META[k].dot}`} aria-hidden="true" />
                  <p className="stat-label">{KIND_META[k].label}</p>
                </div>
                <p className="mt-2 font-display text-2xl tracking-wide text-paper">
                  {found.byKind[k].value > 0
                    ? formatUSD(found.byKind[k].value)
                    : "—"}
                </p>
                <p className="mt-0.5 text-sm text-bone-500">
                  {found.byKind[k].count} item
                  {found.byKind[k].count === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300"
        >
          {error}
        </p>
      )}

      {/* Filters */}
      <div className="filter-rail mt-6">
        {FILTERS.map((f) => {
          const count =
            f.value === "all"
              ? found.opportunities.length
              : found.byKind[f.value].count;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`filter-pill ${filter === f.value ? "filter-pill-active" : ""}`}
            >
              {f.label}
              <span className="text-bone-500">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <ul className="mt-5 space-y-3">
        {shown.map((o) => {
          const meta = KIND_META[o.kind];
          return (
            <li key={o.key} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className={`badge ${meta.accent}`}>{meta.label}</span>
                  <h3 className="mt-2.5 font-display text-xl uppercase leading-tight tracking-wide text-paper">
                    {o.title}
                  </h3>
                  {o.kind !== "dormant" && o.customerName && (
                    <p className="mt-1 text-[15px] font-semibold text-bone-300">
                      {o.customerName}
                    </p>
                  )}
                  <p className="mt-1.5 text-[15px] leading-relaxed text-bone-400">
                    {o.detail}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  {o.value === null ? (
                    <p className="font-display text-2xl tracking-wide text-bone-500">
                      Unpriced
                    </p>
                  ) : (
                    <p className="font-display text-3xl tracking-wide text-money-300">
                      {formatUSD(o.value)}
                    </p>
                  )}
                  <p className="mt-1 max-w-[16rem] text-xs leading-snug text-bone-500">
                    {o.basis}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5 border-t-2 border-ink-700 pt-4 sm:flex-row sm:items-center">
                {o.kind === "unbilled" && o.href && (
                  <Link href={o.href} className="btn-primary text-base sm:w-auto">
                    <IconDollar className="h-5 w-5" /> Raise the invoice
                  </Link>
                )}
                {o.outreach && (
                  <button
                    onClick={() => draftMessage(o)}
                    disabled={drafting === o.key}
                    className="btn-primary text-base sm:w-auto"
                  >
                    <IconSparkle className="h-5 w-5" />
                    {drafting === o.key ? "Drafting…" : "Draft the message"}
                  </button>
                )}
                {o.href && o.kind !== "unbilled" && (
                  <Link href={o.href} className="btn-secondary sm:w-auto">
                    {o.kind === "declined" ? (
                      <>
                        <IconClock className="h-4 w-4" /> Open the quote
                      </>
                    ) : (
                      <>
                        <IconWrench className="h-4 w-4" /> Customer history
                      </>
                    )}
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {draft && (
        <MessageModal
          title={draft.title}
          subtitle={draft.subtitle}
          message={draft.message}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  );
}
