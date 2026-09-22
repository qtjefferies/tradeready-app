"use client";

import { useState } from "react";
import Link from "next/link";
import MessageModal from "./MessageModal";
import { computeTotals, formatUSD } from "@/lib/money";
import type { Invoice, InvoiceStatus } from "@/lib/store";
import { ItemSummary, StatusBadge } from "./Badges";
import { IconDollar, IconInvoice, IconPlus } from "./icons";

const FILTERS: { value: InvoiceStatus | "all" | "attention"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "unpaid", label: "Unpaid" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "draft", label: "Draft" },
];

/** Rail color per invoice status. */
const RAIL: Record<string, string> = {
  draft: "bg-bone-500",
  unpaid: "bg-safety-400",
  sent: "bg-info-400",
  overdue: "bg-alert-400",
  paid: "bg-money-400",
};

/**
 * InvoicesClient — invoice list with a payment-reminder queue.
 * "Draft reminder" calls the AI reminder endpoint and shows the message in a
 * modal to copy. Nothing is sent automatically.
 */
export default function InvoicesClient({ invoices }: { invoices: Invoice[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [modal, setModal] = useState<{ title: string; subtitle: string; message: string } | null>(null);
  const [draftingId, setDraftingId] = useState<number | null>(null);
  const [draftError, setDraftError] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const needsAttention = (inv: Invoice) =>
    (inv.status === "overdue" ||
      ((inv.status === "unpaid" || inv.status === "sent") &&
        inv.due_at !== null &&
        inv.due_at < today));

  const visible = invoices.filter((inv) => {
    if (filter === "all") return true;
    if (filter === "attention") return needsAttention(inv);
    return inv.status === filter;
  });

  const attentionCount = invoices.filter(needsAttention).length;
  const unpaidTotal = invoices
    .filter((i) => i.status !== "paid" && i.status !== "draft")
    .reduce((s, i) => s + computeTotals(i.line_items, i.tax_pct, i.discount).total, 0);
  const unpaidCount = invoices.filter((i) => i.status !== "paid" && i.status !== "draft").length;

  async function draftReminder(inv: Invoice) {
    setDraftingId(inv.id);
    setDraftError("");
    try {
      const res = await fetch("/api/ai/reminder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoice_id: inv.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDraftError(data.detail || data.error || "Couldn't draft a reminder right now.");
        return;
      }
      setModal({
        title: "Payment reminder",
        subtitle: `For ${inv.customer_name || "the customer"} — INV-${inv.id}`,
        message: data.message,
      });
    } catch {
      setDraftError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setDraftingId(null);
    }
  }

  async function markPaid(inv: Invoice) {
    try {
      const res = await fetch(`/api/invoices/${inv.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          paid_at: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setDraftError(data.error || "Couldn't mark the invoice paid.");
        return;
      }
      window.location.reload();
    } catch {
      setDraftError("Couldn't reach the server.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="filter-rail" role="tablist" aria-label="Filter invoices">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={`filter-pill ${filter === f.value ? "filter-pill-active" : ""}`}
            >
              {f.label}
              {f.value === "attention" && attentionCount > 0 && (
                <span className="rounded-full bg-alert-400 px-2 py-0.5 text-xs font-extrabold text-ink-950">
                  {attentionCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary shrink-0 !min-h-[48px] !text-sm">
          <IconPlus className="h-4 w-4" /> New invoice
        </Link>
      </div>

      {unpaidCount > 0 && (
        <div className="well mb-6 flex items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-safety-500/15 text-safety-300">
              <IconDollar className="h-5 w-5" />
            </span>
            <div>
              <p className="stat-label">Outstanding</p>
              <p className="stat-number !text-3xl">{formatUSD(unpaidTotal)}</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-bone-400">
            across {unpaidCount} invoice{unpaidCount === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {draftError && (
        <p role="alert" className="mb-4 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300">
          {draftError}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
            <IconInvoice className="h-8 w-8" />
          </span>
          <p className="mt-5 font-display text-2xl uppercase tracking-wide text-paper">
            {filter === "attention" ? "Nobody owes you money. Beautiful." : "No invoices yet."}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-bone-300">
            {filter === "attention"
              ? "Overdue invoices will show up here with a one-tap reminder draft."
              : "Create one from an accepted quote in a single click — or start fresh."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((inv) => {
            const totals = computeTotals(inv.line_items, inv.tax_pct, inv.discount);
            const attention = needsAttention(inv);
            const daysOverdue =
              inv.due_at && inv.due_at < today
                ? Math.floor(
                    (new Date(today + "T12:00:00").getTime() -
                      new Date(inv.due_at + "T12:00:00").getTime()) /
                      86_400_000
                  )
                : 0;
            return (
              <li key={inv.id}>
                <div
                  className={`card relative flex min-h-[88px] flex-wrap items-center justify-between gap-4 overflow-hidden p-4 transition active:scale-[0.995] sm:p-5 ${
                    attention ? "!border-alert-400/60" : "hover:border-bone-500/50"
                  }`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1.5 ${RAIL[inv.status] ?? "bg-bone-500"}`}
                    aria-hidden="true"
                  />
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    className="min-w-0 flex-1 touch-manipulation pl-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={inv.status} />
                      {attention && (
                        <span className="badge border-alert-400/50 bg-alert-400/20 text-alert-300">
                          {daysOverdue > 0 ? `${daysOverdue}d overdue` : "past due"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-[15px] font-bold text-paper">
                      INV-{inv.id} · {inv.title}
                    </p>
                    <p className="mt-0.5 text-sm text-bone-400">
                      {inv.customer_name || "No customer"}
                      {inv.due_at && (
                        <span className="text-bone-500">
                          {" "}· due {new Date(inv.due_at + "T12:00:00").toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    <ItemSummary items={inv.line_items} total={totals.total} />
                  </Link>
                  <div className="flex shrink-0 items-center gap-2 pl-2">
                    {attention && (
                      <button
                        onClick={() => draftReminder(inv)}
                        disabled={draftingId === inv.id}
                        className="btn-secondary !min-h-[48px] !px-4 !py-2 !text-sm"
                      >
                        {draftingId === inv.id ? "Drafting…" : "✨ Draft reminder"}
                      </button>
                    )}
                    {inv.status !== "paid" && inv.status !== "draft" && (
                      <button
                        onClick={() => markPaid(inv)}
                        className="btn-success"
                      >
                        Mark paid
                      </button>
                    )}
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="btn-ghost"
                      aria-label={`Open invoice INV-${inv.id}`}
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
