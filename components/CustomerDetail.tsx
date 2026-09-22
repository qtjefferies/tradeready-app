"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { computeTotals, formatUSD } from "@/lib/money";
import type { Customer, CustomerHistory } from "@/lib/store";
import { StatusBadge } from "./Badges";
import { IconPlus } from "./icons";
import { useConfirm } from "./ConfirmDialog";

/**
 * CustomerDetail — customer profile + full job history (the retention moat):
 * quotes, invoices, jobs, equipment/install records, reviews.
 */
export default function CustomerDetail({
  customer,
  history,
}: {
  customer: Customer;
  history: CustomerHistory;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone);
  const [email, setEmail] = useState(customer.email);
  const [address, setAddress] = useState(customer.address);
  const [notes, setNotes] = useState(customer.notes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Equipment form
  const [eqDesc, setEqDesc] = useState("");
  const [eqDate, setEqDate] = useState("");
  const [eqNotes, setEqNotes] = useState("");
  const [eqSaving, setEqSaving] = useState(false);

  async function saveProfile() {
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the customer.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function addEquipment() {
    if (!eqDesc.trim()) {
      setError("Describe the equipment first.");
      return;
    }
    setEqSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "add-equipment",
          description: eqDesc.trim(),
          installed_at: eqDate || null,
          notes: eqNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the equipment record.");
        return;
      }
      setEqDesc("");
      setEqDate("");
      setEqNotes("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setEqSaving(false);
    }
  }

  async function removeEquipment(eqId: number) {
    const ok = await confirm({
      title: "Delete this equipment record?",
      body: "You'll lose the install date, which is what puts this customer on your replacement-call list later.",
      confirmLabel: "Delete record",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete-equipment", equipment_id: eqId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't delete the record.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  async function removeCustomer() {
    const ok = await confirm({
      title: `Delete ${customer.name}?`,
      body: "Their quotes, invoices and jobs stay on file, but the customer record and all equipment history go — including anything Money Found was tracking for them.",
      confirmLabel: "Delete customer",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't delete the customer.");
        return;
      }
      router.push("/dashboard/customers");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  const lifetimeBilled = history.invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + computeTotals(i.line_items, i.tax_pct, i.discount).total, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      {error && (
        <p role="alert" className="rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300">
          {error}
        </p>
      )}

      <div className="card p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
            {editing ? "Edit customer" : customer.name}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="btn-secondary !min-h-[48px] !px-5 !text-sm"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            {!editing && (
              <button onClick={removeCustomer} className="btn-danger">
                Delete
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-name" className="label-dark">Name</label>
              <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} className="input-dark" />
            </div>
            <div>
              <label htmlFor="c-phone" className="label-dark">Phone</label>
              <input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-dark" />
            </div>
            <div>
              <label htmlFor="c-email" className="label-dark">Email</label>
              <input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" />
            </div>
            <div>
              <label htmlFor="c-address" className="label-dark">Address</label>
              <input id="c-address" value={address} onChange={(e) => setAddress(e.target.value)} className="input-dark" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="c-notes" className="label-dark">Notes</label>
              <textarea id="c-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="input-dark" placeholder="Gate code, dog's name, prefers texts after 5pm…" />
            </div>
            <div className="sm:col-span-2">
              <button onClick={saveProfile} disabled={saving} className="btn-primary w-full text-base sm:w-auto">
                {saving ? "Saving…" : "Save customer"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 text-[15px] sm:grid-cols-2">
            <div>
              <p className="stat-label">Contact</p>
              <p className="mt-1.5 font-semibold text-bone-200">{customer.phone || "—"}</p>
              <p className="text-bone-400">{customer.email || ""}</p>
            </div>
            <div>
              <p className="stat-label">Address</p>
              <p className="mt-1.5 font-semibold text-bone-200">{customer.address || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="stat-label">Notes</p>
              <p className="mt-1.5 whitespace-pre-wrap text-bone-300">{customer.notes || "—"}</p>
            </div>
            <div className="flex gap-8 border-t-2 border-ink-600 pt-5 sm:col-span-2">
              <div>
                <p className="stat-label">Lifetime billed</p>
                <p className="mt-1.5 font-display text-3xl tracking-wide text-safety-300">{formatUSD(lifetimeBilled)}</p>
              </div>
              <div>
                <p className="stat-label">Jobs</p>
                <p className="mt-1.5 font-display text-3xl tracking-wide text-paper">{history.jobs.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="card p-5 sm:p-7">
        <h3 className="font-display text-xl uppercase tracking-wide text-paper">Equipment & installs</h3>
        <p className="mt-1.5 text-[15px] text-bone-300">
          What you installed and when — so you know when it&apos;s due for replacement.
        </p>
        {history.equipment.length > 0 ? (
          <ul className="mt-5 space-y-2.5">
            {history.equipment.map((eq) => {
              const age = eq.installed_at
                ? Math.floor(
                    (Date.now() - new Date(eq.installed_at + "T12:00:00").getTime()) / 31_556_952_000
                  )
                : null;
              return (
                <li
                  key={eq.id}
                  className="flex items-start justify-between gap-3 rounded-xl border-2 border-ink-600 bg-ink-900 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-paper">{eq.description}</p>
                    <p className="mt-1 text-sm text-bone-400">
                      {eq.installed_at
                        ? `Installed ${new Date(eq.installed_at + "T12:00:00").toLocaleDateString()}${age !== null && age >= 0 ? ` · ~${age} yr${age === 1 ? "" : "s"} old` : ""}`
                        : "Install date unknown"}
                      {eq.notes ? ` · ${eq.notes}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => removeEquipment(eq.id)}
                    className="flex h-11 min-w-[64px] shrink-0 touch-manipulation items-center justify-center rounded-lg px-2 text-sm font-bold text-bone-500 transition hover:bg-alert-400/10 hover:text-alert-300 active:scale-95"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl border-2 border-dashed border-ink-600 px-4 py-4 text-[15px] text-bone-500">
            No equipment logged yet. Add the water heater, panel, or unit you installed —
            future-you will thank present-you.
          </p>
        )}
        <div className="mt-5 grid gap-3 rounded-xl border-2 border-ink-600 bg-ink-900/60 p-4 sm:grid-cols-[1fr_170px]">
          <input
            type="text"
            value={eqDesc}
            onChange={(e) => setEqDesc(e.target.value)}
            placeholder="e.g. Rheem 50-gal electric water heater"
            className="input-dark sm:col-span-2"
            aria-label="Equipment description"
          />
          <input
            type="date"
            value={eqDate}
            onChange={(e) => setEqDate(e.target.value)}
            className="input-dark"
            aria-label="Install date"
          />
          <input
            type="text"
            value={eqNotes}
            onChange={(e) => setEqNotes(e.target.value)}
            placeholder="Notes (model, warranty…)"
            className="input-dark"
            aria-label="Equipment notes"
          />
          <div className="sm:col-span-2">
            <button onClick={addEquipment} disabled={eqSaving} className="btn-secondary w-full text-base sm:w-auto">
              <IconPlus className="h-5 w-5" /> {eqSaving ? "Saving…" : "Log equipment"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-xl uppercase tracking-wide text-paper">Quotes</h3>
          {history.quotes.length === 0 ? (
            <p className="mt-3 text-[15px] text-bone-500">No quotes for this customer yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {history.quotes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/dashboard/quotes/${q.id}`}
                    className="flex min-h-[64px] touch-manipulation items-center justify-between gap-3 rounded-xl border-2 border-ink-600 bg-ink-900 px-4 py-3 transition hover:border-safety-500/40 active:scale-[0.99]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold text-paper">{q.title}</span>
                      <span className="text-sm text-bone-400">
                        {formatUSD(computeTotals(q.line_items, q.tax_pct, q.discount).total)}
                      </span>
                    </span>
                    <StatusBadge status={q.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/quotes/new"
            className="btn-ghost mt-4 !px-2"
          >
            <IconPlus className="h-4 w-4" /> New quote
          </Link>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-xl uppercase tracking-wide text-paper">Invoices</h3>
          {history.invoices.length === 0 ? (
            <p className="mt-3 text-[15px] text-bone-500">No invoices for this customer yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {history.invoices.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/dashboard/invoices/${i.id}`}
                    className="flex min-h-[64px] touch-manipulation items-center justify-between gap-3 rounded-xl border-2 border-ink-600 bg-ink-900 px-4 py-3 transition hover:border-safety-500/40 active:scale-[0.99]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-bold text-paper">{i.title}</span>
                      <span className="text-sm text-bone-400">
                        {formatUSD(computeTotals(i.line_items, i.tax_pct, i.discount).total)}
                      </span>
                    </span>
                    <StatusBadge status={i.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/invoices/new"
            className="btn-ghost mt-4 !px-2"
          >
            <IconPlus className="h-4 w-4" /> New invoice
          </Link>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-xl uppercase tracking-wide text-paper">Jobs</h3>
          {history.jobs.length === 0 ? (
            <p className="mt-3 text-[15px] text-bone-500">No jobs scheduled for this customer yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {history.jobs.map((j) => (
                <li
                  key={j.id}
                  className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border-2 border-ink-600 bg-ink-900 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold text-paper">{j.title}</span>
                    <span className="text-sm text-bone-400">
                      {j.scheduled_at ? new Date(j.scheduled_at).toLocaleString() : "Unscheduled"}
                    </span>
                  </span>
                  <StatusBadge status={j.status} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/schedule"
            className="btn-ghost mt-4 !px-2"
          >
            Open schedule →
          </Link>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="font-display text-xl uppercase tracking-wide text-paper">Reviews</h3>
          {history.reviews.length === 0 ? (
            <p className="mt-3 text-[15px] text-bone-500">No review requests for this customer yet.</p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {history.reviews.map((r) => (
                <li
                  key={r.id}
                  className="flex min-h-[64px] items-center justify-between gap-3 rounded-xl border-2 border-ink-600 bg-ink-900 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold text-paper">
                      {r.job_title || "Review request"}
                    </span>
                    <span className="text-sm text-bone-400">
                      {r.status === "received" && r.rating
                        ? `${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}`
                        : `Requested ${new Date(r.requested_at).toLocaleDateString()}`}
                    </span>
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/dashboard/reviews"
            className="btn-ghost mt-4 !px-2"
          >
            Open reviews →
          </Link>
        </div>
      </section>
    </div>
  );
}
