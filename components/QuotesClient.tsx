"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MessageModal from "./MessageModal";
import { computeTotals } from "@/lib/money";
import type { Quote, QuoteStatus } from "@/lib/store";
import { ItemSummary, StatusBadge } from "./Badges";
import { IconPlus, IconQuote } from "./icons";

const FILTERS: { value: QuoteStatus | "all" | "stale"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stale", label: "Needs follow-up" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

/** Rail color per quote status — scannable at a glance, even in sunlight. */
const RAIL: Record<string, string> = {
  draft: "bg-bone-500",
  sent: "bg-info-400",
  viewed: "bg-grape-400",
  accepted: "bg-money-400",
  declined: "bg-alert-400",
};

/**
 * QuotesClient — quote list with a follow-up queue on top.
 * "Draft nudge" calls the AI follow-up endpoint and shows the message in a
 * modal to copy. Nothing is sent automatically.
 */
export default function QuotesClient({ quotes }: { quotes: Quote[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [modal, setModal] = useState<{ title: string; subtitle: string; message: string } | null>(null);
  const [draftingId, setDraftingId] = useState<number | null>(null);
  const [draftError, setDraftError] = useState("");

  const staleIds = useMemo(() => {
    const cutoff = Date.now() - 2 * 86_400_000;
    return new Set(
      quotes
        .filter(
          (q) =>
            (q.status === "sent" || q.status === "viewed") &&
            q.sent_at &&
            new Date(q.sent_at).getTime() < cutoff
        )
        .map((q) => q.id)
    );
  }, [quotes]);

  const visible = quotes.filter((q) => {
    if (filter === "all") return true;
    if (filter === "stale") return staleIds.has(q.id);
    return q.status === filter;
  });

  const staleCount = staleIds.size;

  async function draftNudge(quote: Quote) {
    setDraftingId(quote.id);
    setDraftError("");
    try {
      const res = await fetch("/api/ai/followup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quote_id: quote.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDraftError(data.detail || data.error || "Couldn't draft a nudge right now.");
        return;
      }
      setModal({
        title: "Follow-up nudge",
        subtitle: `For ${quote.customer_name || "the customer"} — quote Q-${quote.id}`,
        message: data.message,
      });
    } catch {
      setDraftError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setDraftingId(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="filter-rail" role="tablist" aria-label="Filter quotes">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`filter-pill ${filter === f.value ? "filter-pill-active" : ""}`}
            >
              {f.label}
              {f.value === "stale" && staleCount > 0 && (
                <span className="rounded-full bg-safety-500 px-2 py-0.5 text-xs font-extrabold text-ink-950">
                  {staleCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link href="/dashboard/quotes/new" className="btn-primary shrink-0 !min-h-[48px] !text-sm">
          <IconPlus className="h-4 w-4" /> New quote
        </Link>
      </div>

      {draftError && (
        <p role="alert" className="mb-4 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300">
          {draftError}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
            <IconQuote className="h-8 w-8" />
          </span>
          <p className="mt-5 font-display text-2xl uppercase tracking-wide text-paper">
            {filter === "stale" ? "Nothing waiting on follow-up. Nice." : "No quotes yet."}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-bone-300">
            {filter === "stale"
              ? "Quotes you sent over 2 days ago with no answer will show up here."
              : "Describe a job in plain words and let the AI draft the line items."}
          </p>
          {filter === "all" && (
            <Link href="/dashboard/quotes/new" className="btn-primary mt-6">
              <IconPlus className="h-5 w-5" /> Create your first quote
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((q) => {
            const totals = computeTotals(q.line_items, q.tax_pct, q.discount);
            const isStale = staleIds.has(q.id);
            return (
              <li key={q.id}>
                <div
                  className={`card relative flex min-h-[88px] flex-wrap items-center justify-between gap-4 overflow-hidden p-4 transition active:scale-[0.995] sm:p-5 ${
                    isStale ? "!border-safety-500/60" : "hover:border-bone-500/50"
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1.5 ${RAIL[q.status] ?? "bg-bone-500"}`}
                    aria-hidden="true"
                  />
                  <Link
                    href={`/dashboard/quotes/${q.id}`}
                    className="min-w-0 flex-1 touch-manipulation pl-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={q.status} />
                      {isStale && (
                        <span className="badge border-safety-500/50 bg-safety-500/20 text-safety-300">
                          needs follow-up
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-[15px] font-bold text-paper">
                      Q-{q.id} · {q.title}
                    </p>
                    <p className="mt-0.5 text-sm text-bone-400">
                      {q.customer_name || "No customer"}
                      {q.sent_at && (
                        <span className="text-bone-500">
                          {" "}· sent {new Date(q.sent_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    <ItemSummary items={q.line_items} total={totals.total} />
                  </Link>
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    {isStale && (
                      <button
                        onClick={() => draftNudge(q)}
                        disabled={draftingId === q.id}
                        className="btn-secondary !min-h-[48px] !px-4 !py-2 !text-sm"
                      >
                        {draftingId === q.id ? "Drafting…" : "✨ Draft nudge"}
                      </button>
                    )}
                    <Link
                      href={`/dashboard/quotes/${q.id}`}
                      className="btn-ghost"
                      aria-label={`Open quote Q-${q.id}`}
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {modal && (
        <MessageModal
          title={modal.title}
          subtitle={modal.subtitle}
          message={modal.message}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
