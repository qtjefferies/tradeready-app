"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import MessageModal from "./MessageModal";
import { computeTotals } from "@/lib/money";
import type { Quote, QuoteStatus } from "@/lib/store";
import { ItemSummary, StatusBadge } from "./Badges";

const FILTERS: { value: QuoteStatus | "all" | "stale"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "stale", label: "Needs follow-up" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                filter === f.value
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {f.label}
              {f.value === "stale" && staleCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{staleCount}</span>
              )}
            </button>
          ))}
        </div>
        <Link href="/dashboard/quotes/new" className="btn-primary !py-2.5 text-sm">
          + New quote
        </Link>
      </div>

      {draftError && (
        <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {draftError}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-lg font-bold text-white">
            {filter === "stale" ? "Nothing waiting on follow-up. Nice." : "No quotes yet."}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {filter === "stale"
              ? "Quotes you sent over 2 days ago with no answer will show up here."
              : "Describe a job in plain words and let the AI draft the line items."}
          </p>
          {filter === "all" && (
            <Link href="/dashboard/quotes/new" className="btn-primary mt-5 text-sm">
              Create your first quote
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
                  className={`card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-amber-400/40 ${
                    isStale ? "border-amber-400/40" : ""
                  }`}
                >
                  <Link href={`/dashboard/quotes/${q.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={q.status} />
                      {isStale && (
                        <span className="badge bg-amber-500/20 text-amber-300">
                          needs follow-up
                        </span>
                      )}
                      <p className="truncate text-sm font-semibold text-white">
                        Q-{q.id} · {q.title}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {q.customer_name || "No customer"}
                      {q.sent_at && (
                        <span className="text-slate-500">
                          {" "}· sent {new Date(q.sent_at).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    <ItemSummary items={q.line_items} total={totals.total} />
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {isStale && (
                      <button
                        onClick={() => draftNudge(q)}
                        disabled={draftingId === q.id}
                        className="btn-secondary !px-4 !py-2 text-xs"
                      >
                        {draftingId === q.id ? "Drafting…" : "✨ Draft nudge"}
                      </button>
                    )}
                    <Link
                      href={`/dashboard/quotes/${q.id}`}
                      className="text-sm font-semibold text-amber-300 hover:text-amber-200"
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
