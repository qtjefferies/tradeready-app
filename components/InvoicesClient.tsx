"use client";

import { useState } from "react";
import Link from "next/link";
import MessageModal from "./MessageModal";
import { computeTotals, formatUSD } from "@/lib/money";
import type { Invoice, InvoiceStatus } from "@/lib/store";
import { ItemSummary, StatusBadge } from "./Badges";

const FILTERS: { value: InvoiceStatus | "all" | "attention"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "unpaid", label: "Unpaid" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "draft", label: "Draft" },
];

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
              {f.value === "attention" && attentionCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-xs">{attentionCount}</span>
              )}
            </button>
          ))}
        </div>
        <Link href="/dashboard/invoices/new" className="btn-primary !py-2.5 text-sm">
          + New invoice
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
            {filter === "attention" ? "Nobody owes you money. Beautiful." : "No invoices yet."}
          </p>
          <p className="mt-2 text-sm text-slate-400">
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
                  className={`card flex flex-wrap items-center justify-between gap-4 p-5 transition hover:border-amber-400/40 ${
                    attention ? "border-red-400/40" : ""
                  }`}
                >
                  <Link href={`/dashboard/invoices/${inv.id}`} className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={inv.status} />
                      {attention && (
                        <span className="badge bg-red-500/20 text-red-300">
                          {daysOverdue > 0 ? `${daysOverdue}d overdue` : "past due"}
                        </span>
                      )}
                      <p className="truncate text-sm font-semibold text-white">
                        INV-{inv.id} · {inv.title}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      {inv.customer_name || "No customer"}
                      {inv.due_at && (
                        <span className="text-slate-500">
                          {" "}· due {new Date(inv.due_at + "T12:00:00").toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    <ItemSummary items={inv.line_items} total={totals.total} />
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    {attention && (
                      <button
                        onClick={() => draftReminder(inv)}
                        disabled={draftingId === inv.id}
                        className="btn-secondary !px-4 !py-2 text-xs"
                      >
                        {draftingId === inv.id ? "Drafting…" : "✨ Draft reminder"}
                      </button>
                    )}
                    {inv.status !== "paid" && inv.status !== "draft" && (
                      <button
                        onClick={() => markPaid(inv)}
                        className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        Mark paid
                      </button>
                    )}
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
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

      <p className="mt-4 text-sm text-slate-500">
        Unpaid total:{" "}
        <span className="font-semibold text-slate-200">
          {formatUSD(
            invoices
              .filter((i) => i.status !== "paid" && i.status !== "draft")
              .reduce(
                (s, i) => s + computeTotals(i.line_items, i.tax_pct, i.discount).total,
                0
              )
          )}
        </span>{" "}
        outstanding across {invoices.filter((i) => i.status !== "paid" && i.status !== "draft").length} invoices.
      </p>

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
