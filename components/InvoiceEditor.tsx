"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LineItemsEditor from "./LineItemsEditor";
import { computeTotals, formatUSD, type LineItem } from "@/lib/money";
import type { Customer, Invoice, InvoiceStatus } from "@/lib/store";
import { StatusBadge } from "./Badges";
import { IconDownload } from "./icons";
import { useConfirm } from "./ConfirmDialog";
import { useToast } from "./Toast";

const STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "unpaid", label: "Unpaid" },
  { value: "sent", label: "Sent" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];

/**
 * InvoiceEditor — create or edit an invoice. Can be seeded from a quote
 * (via ?fromQuote=<id> on the new page, handled server-side).
 */
export default function InvoiceEditor({
  initial,
  customers,
  seeded,
}: {
  initial: Invoice | null;
  customers: Customer[];
  seeded: Partial<Invoice> | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const base = initial ?? seeded;
  const [title, setTitle] = useState(base?.title ?? "");
  const [customerId, setCustomerId] = useState<string>(
    base?.customer_id ? String(base.customer_id) : ""
  );
  const [customerName, setCustomerName] = useState(base?.customer_name ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(initial?.status ?? "unpaid");
  const [lineItems, setLineItems] = useState<LineItem[]>(base?.line_items ?? []);
  const [taxPct, setTaxPct] = useState<number>(base?.tax_pct ?? 0);
  const [discount, setDiscount] = useState<number>(base?.discount ?? 0);
  const [notes, setNotes] = useState(base?.notes ?? "");
  const [dueAt, setDueAt] = useState(base?.due_at ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  async function save(nextStatus?: InvoiceStatus, paidToday = false) {
    const cust = resolvedCustomer();
    if (!title.trim()) {
      setError("Give the invoice a title.");
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
      quote_id: base?.quote_id ?? null,
      status: nextStatus ?? status,
      line_items: lineItems,
      tax_pct: taxPct,
      discount,
      notes: notes.trim(),
      due_at: dueAt || null,
      paid_at: paidToday
        ? new Date().toISOString().slice(0, 10)
        : initial?.paid_at ?? null,
      sent_at:
        (nextStatus ?? status) === "sent" && !initial?.sent_at
          ? new Date().toISOString()
          : initial?.sent_at ?? null,
    };
    try {
      const res = await fetch(
        isNew ? "/api/invoices" : `/api/invoices/${initial!.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the invoice.");
        return;
      }
      toast(isNew ? "Invoice saved." : "Changes saved.");
      router.push(`/dashboard/invoices/${data.invoice.id}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: "Delete this invoice?",
      body: "This can't be undone. If the work was done, you'll have no record of billing for it.",
      confirmLabel: "Delete invoice",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${initial.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't delete the invoice.");
        return;
      }
      router.push("/dashboard/invoices");
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
            {isNew ? "New invoice" : `Invoice INV-${initial!.id}`}
          </h2>
          {!isNew && <StatusBadge status={initial!.status} />}
        </div>

        {seeded && isNew && (
          <p className="mb-5 rounded-xl border-2 border-money-400/40 bg-money-400/10 px-4 py-3 text-[15px] font-semibold text-money-300">
            Built from quote Q-{seeded.quote_id} — review the lines, set a due date, save.
          </p>
        )}

        {error && (
          <p role="alert" className="mb-5 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300">
            {error}
          </p>
        )}

        <div className="mb-5">
          <label htmlFor="i-title" className="label-dark">Invoice title</label>
          <input
            id="i-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Water heater replacement"
            className="input-dark"
          />
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="i-customer" className="label-dark">Customer</label>
            <select
              id="i-customer"
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
            <label htmlFor="i-due" className="label-dark">Due date</label>
            <input
              id="i-due"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="input-dark"
            />
          </div>
        </div>

        {!customerId && (
          <div className="mb-5">
            <label htmlFor="i-customer-name" className="label-dark">Customer name</label>
            <input
              id="i-customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Jane Miller"
              className="input-dark"
            />
          </div>
        )}

        <LineItemsEditor initial={base?.line_items ?? []} onChange={setLineItems} />

        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="i-tax" className="label-dark">Tax %</label>
            <input
              id="i-tax"
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
            <label htmlFor="i-discount" className="label-dark">Discount ($)</label>
            <input
              id="i-discount"
              type="number"
              min={0}
              step="any"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              className="input-dark"
            />
          </div>
        </div>

        <div className="mb-2">
          <label htmlFor="i-notes" className="label-dark">Notes (shown on the PDF)</label>
          <textarea
            id="i-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Payment due within 14 days. Thank you for your business."
            className="input-dark"
          />
        </div>

        <div className="sticky-actions mt-6">
          <div className="flex flex-col gap-3">
            <p className="flex items-baseline justify-between gap-2 md:hidden">
              <span className="stat-label">Total due</span>
              <span className="font-display text-3xl tracking-wide text-safety-300">
                {formatUSD(totals.total)}
              </span>
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button onClick={() => save()} disabled={saving} className="btn-primary w-full text-base sm:w-auto">
                {saving ? "Saving…" : isNew ? "Save invoice" : "Save changes"}
              </button>
              <button onClick={() => save("sent")} disabled={saving} className="btn-secondary w-full text-base sm:w-auto">
                Save & mark sent
              </button>
              {!isNew && initial!.status !== "paid" && (
                <button onClick={() => save("paid", true)} disabled={saving} className="btn-success !min-h-[52px] w-full !text-base sm:w-auto">
                  Mark paid
                </button>
              )}
              {!isNew && (
                <Link href={`/api/invoices/${initial!.id}/pdf`} className="btn-secondary w-full text-base sm:w-auto">
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
            <dt className="font-bold text-paper">Total due</dt>
            <dd className="font-display text-4xl tracking-wide text-safety-300">{formatUSD(totals.total)}</dd>
          </div>
        </dl>

        {!isNew && (
          <div className="mt-6 border-t-2 border-ink-600 pt-5">
            <label htmlFor="i-status" className="label-dark">Status</label>
            <div className="flex gap-2">
              <select
                id="i-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
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
          </div>
        )}
      </aside>
    </div>
  );
}
