"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LineItemsEditor from "./LineItemsEditor";
import { computeTotals, formatUSD, type LineItem } from "@/lib/money";
import type { Customer, Quote, QuoteStatus } from "@/lib/store";
import { StatusBadge } from "./Badges";
import { IconDownload } from "./icons";

const STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

/**
 * QuoteEditor — create or edit a quote. Includes:
 * - customer picker (or free-text name)
 * - AI assist: describe the job in plain words → draft line items
 * - labor/materials line items, tax %, flat discount, live totals
 * - status workflow, PDF download, delete
 */
export default function QuoteEditor({
  initial,
  customers,
  trade,
}: {
  initial: Quote | null;
  customers: Customer[];
  trade: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [customerId, setCustomerId] = useState<string>(
    initial?.customer_id ? String(initial.customer_id) : ""
  );
  const [customerName, setCustomerName] = useState(initial?.customer_name ?? "");
  const [status, setStatus] = useState<QuoteStatus>(initial?.status ?? "draft");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.line_items ?? []
  );
  const [taxPct, setTaxPct] = useState<number>(initial?.tax_pct ?? 0);
  const [discount, setDiscount] = useState<number>(initial?.discount ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // AI assist state
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistText, setAssistText] = useState("");
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState("");
  const [assumptions, setAssumptions] = useState("");

  const totals = useMemo(
    () => computeTotals(lineItems, taxPct, discount),
    [lineItems, taxPct, discount]
  );

  const isNew = !initial;

  function resolvedCustomer(): { id: number | null; name: string } {
    if (customerId) {
      const c = customers.find((x) => String(x.id) === customerId);
      return { id: c ? c.id : null, name: c ? c.name : customerName };
    }
    return { id: null, name: customerName.trim() };
  }

  async function runAssist() {
    if (assistText.trim().length < 10) {
      setAssistError("Describe the job in a sentence or two first.");
      return;
    }
    setAssistLoading(true);
    setAssistError("");
    setAssumptions("");
    try {
      const res = await fetch("/api/ai/assist-quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: assistText.trim(), trade }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAssistError(data.detail || data.error || "The AI couldn't help right now.");
        return;
      }
      setLineItems(data.lineItems ?? []);
      if (data.assumptions) setAssumptions(data.assumptions);
      setAssistOpen(false);
    } catch {
      setAssistError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setAssistLoading(false);
    }
  }

  async function save(nextStatus?: QuoteStatus) {
    const cust = resolvedCustomer();
    if (!title.trim()) {
      setError("Give the quote a title (e.g. “Water heater replacement”).");
      return;
    }
    if (!cust.name) {
      setError("Pick a customer or type a customer name.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      title: title.trim(),
      customer_id: cust.id,
      customer_name: cust.name,
      status: nextStatus ?? status,
      line_items: lineItems,
      tax_pct: taxPct,
      discount,
      notes: notes.trim(),
      valid_until: validUntil || null,
      sent_at:
        (nextStatus ?? status) === "sent" && !initial?.sent_at
          ? new Date().toISOString()
          : initial?.sent_at ?? null,
    };
    try {
      const res = await fetch(
        isNew ? "/api/quotes" : `/api/quotes/${initial!.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the quote.");
        return;
      }
      router.push(`/dashboard/quotes/${data.quote.id}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial || !confirm("Delete this quote? This can't be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't delete the quote.");
        return;
      }
      router.push("/dashboard/quotes");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
      <div className="card p-5 sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
            {isNew ? "New quote" : `Quote Q-${initial!.id}`}
          </h2>
          {!isNew && <StatusBadge status={initial!.status} />}
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300">
            {error}
          </p>
        )}

        <div className="mb-5">
          <label htmlFor="q-title" className="label-dark">Job title</label>
          <input
            id="q-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Water heater replacement"
            className="input-dark"
          />
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="q-customer" className="label-dark">Customer</label>
            <select
              id="q-customer"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                if (e.target.value) setCustomerName("");
              }}
              className="input-dark"
            >
              <option value="">Type a name instead…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-customer-name" className="label-dark">
              {customerId ? "Customer (selected)" : "Customer name"}
            </label>
            <input
              id="q-customer-name"
              type="text"
              value={customerId ? customers.find((c) => String(c.id) === customerId)?.name ?? "" : customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={Boolean(customerId)}
              placeholder="e.g. Jane Miller"
              className="input-dark disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mb-6">
          <button
            type="button"
            onClick={() => setAssistOpen((v) => !v)}
            aria-expanded={assistOpen}
            className="btn-primary w-full text-base"
          >
            {assistOpen ? "Hide AI assist" : "✨ Describe the job — AI drafts the lines"}
          </button>
          {assistOpen && (
            <div className="mt-3 rounded-xl border-2 border-safety-500/40 bg-safety-500/[0.07] p-4 sm:p-5">
              <label htmlFor="q-assist" className="label-dark">
                Describe the job in plain words
              </label>
              <textarea
                id="q-assist"
                rows={3}
                value={assistText}
                onChange={(e) => setAssistText(e.target.value)}
                placeholder="e.g. Replace a 50-gallon electric water heater in the garage. Old one is leaking from the bottom. Need to haul the old one away."
                className="input-dark"
              />
              {assistError && (
                <p role="alert" className="mt-2 text-[15px] font-semibold text-alert-300">{assistError}</p>
              )}
              <button
                type="button"
                onClick={runAssist}
                disabled={assistLoading}
                className="btn-primary mt-3 w-full text-base sm:w-auto"
              >
                {assistLoading ? "Drafting line items…" : "Draft line items"}
              </button>
              <p className="mt-2.5 text-sm text-bone-400">
                AI prices from typical US market rates — always review and adjust
                before sending. Nothing is saved until you save the quote.
              </p>
            </div>
          )}
          {assumptions && (
            <p className="mt-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-3 text-sm text-bone-300">
              AI assumption: {assumptions}
            </p>
          )}
        </div>

        <LineItemsEditor initial={initial?.line_items ?? []} onChange={setLineItems} />

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="q-tax" className="label-dark">Tax %</label>
            <input
              id="q-tax"
              type="number"
              min={0}
              max={100}
              step="any"
              value={taxPct}
              onChange={(e) => setTaxPct(Math.max(0, Number(e.target.value) || 0))}
              className="input-dark"
            />
          </div>
          <div>
            <label htmlFor="q-discount" className="label-dark">Discount ($)</label>
            <input
              id="q-discount"
              type="number"
              min={0}
              step="any"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="input-dark"
            />
          </div>
          <div>
            <label htmlFor="q-valid" className="label-dark">Valid until</label>
            <input
              id="q-valid"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="input-dark"
            />
          </div>
        </div>

        <div className="mb-2">
          <label htmlFor="q-notes" className="label-dark">Notes (shown on the PDF)</label>
          <textarea
            id="q-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Price includes haul-away of the old unit. 1-year labor warranty."
            className="input-dark"
          />
        </div>

        <div className="sticky-actions mt-6">
          <div className="flex flex-col gap-3">
            <p className="flex items-baseline justify-between gap-2 md:hidden">
              <span className="stat-label">Quote total</span>
              <span className="font-display text-3xl tracking-wide text-safety-300">
                {formatUSD(totals.total)}
              </span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button onClick={() => save()} disabled={saving} className="btn-primary w-full text-base sm:w-auto">
                {saving ? "Saving…" : isNew ? "Save quote" : "Save changes"}
              </button>
              {(status === "draft" || isNew) && (
                <button
                  onClick={() => save("sent")}
                  disabled={saving}
                  className="btn-secondary w-full text-base sm:w-auto"
                >
                  Save & mark sent
                </button>
              )}
              {!isNew && (
                <Link href={`/api/quotes/${initial!.id}/pdf`} className="btn-secondary w-full text-base sm:w-auto">
                  <IconDownload className="h-4 w-4" /> PDF
                </Link>
              )}
              {!isNew && (
                <button onClick={remove} disabled={deleting} className="btn-danger sm:ml-auto">
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="card h-fit p-5 sm:p-6 lg:sticky lg:top-24">
        <h3 className="font-display text-xl uppercase tracking-wide text-paper">Totals</h3>
        <dl className="mt-4 space-y-2.5 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-bone-400">Labor</dt>
            <dd className="font-semibold text-bone-200">{formatUSD(totals.laborTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone-400">Materials</dt>
            <dd className="font-semibold text-bone-200">{formatUSD(totals.materialsTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-bone-400">Subtotal</dt>
            <dd className="font-semibold text-bone-200">{formatUSD(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between">
              <dt className="text-bone-400">Discount</dt>
              <dd className="font-semibold text-bone-200">−{formatUSD(totals.discount)}</dd>
            </div>
          )}
          {totals.tax > 0 && (
            <div className="flex justify-between">
              <dt className="text-bone-400">Tax ({taxPct}%)</dt>
              <dd className="font-semibold text-bone-200">{formatUSD(totals.tax)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t-2 border-ink-600 pt-4">
            <dt className="font-bold text-paper">Total</dt>
            <dd className="font-display text-4xl tracking-wide text-safety-300">{formatUSD(totals.total)}</dd>
          </div>
        </dl>

        {!isNew && (
          <div className="mt-6 border-t-2 border-ink-600 pt-5">
            <label htmlFor="q-status" className="label-dark">Status</label>
            <div className="flex gap-2">
              <select
                id="q-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                className="input-dark min-h-[48px] flex-1"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => save()}
                disabled={saving}
                className="btn-secondary min-h-[48px] shrink-0 !px-5 text-sm"
              >
                Apply
              </button>
            </div>
            {initial!.status === "accepted" && (
              <Link
                href={`/dashboard/invoices/new?fromQuote=${initial!.id}`}
                className="btn-primary mt-4 w-full text-base"
              >
                Create invoice from this quote
              </Link>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
