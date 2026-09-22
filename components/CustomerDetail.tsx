"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { computeTotals, formatUSD } from "@/lib/money";
import type { Customer, CustomerHistory } from "@/lib/store";
import { StatusBadge } from "./Badges";

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
    if (!confirm("Delete this equipment record?")) return;
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
    if (
      !confirm(
        `Delete ${customer.name}? Their quotes, invoices, and jobs stay, but the customer record and equipment history go.`
      )
    )
      return;
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
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-white">
            {editing ? "Edit customer" : customer.name}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing((v) => !v)}
              className="btn-secondary !px-4 !py-2 text-sm"
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
              <input id="c-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-dark" />
            </div>
            <div>
              <label htmlFor="c-email" className="label-dark">Email</label>
              <input id="c-email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-dark" />
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
              <button onClick={saveProfile} disabled={saving} className="btn-primary text-sm">
                {saving ? "Saving…" : "Save customer"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Contact</p>
              <p className="mt-1 text-slate-200">{customer.phone || "—"}</p>
              <p className="text-slate-400">{customer.email || ""}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500">Address</p>
              <p className="mt-1 text-slate-200">{customer.address || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase tracking-widest text-slate-500">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-300">{customer.notes || "—"}</p>
            </div>
            <div className="sm:col-span-2 flex gap-6 border-t border-white/10 pt-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Lifetime billed</p>
                <p className="mt-1 font-display text-xl font-bold text-amber-300">{formatUSD(lifetimeBilled)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">Jobs</p>
                <p className="mt-1 font-display text-xl font-bold text-white">{history.jobs.length}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="card p-6">
        <h3 className="font-display text-base font-bold text-white">Equipment & installs</h3>
        <p className="mt-1 text-sm text-slate-400">
          What you installed and when — so you know when it&apos;s due for replacement.
        </p>
        {history.equipment.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {history.equipment.map((eq) => {
              const age = eq.installed_at
                ? Math.floor(
                    (Date.now() - new Date(eq.installed_at + "T12:00:00").getTime()) / 31_556_952_000
                  )
                : null;
              return (
                <li
                  key={eq.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{eq.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {eq.installed_at
                        ? `Installed ${new Date(eq.installed_at + "T12:00:00").toLocaleDateString()}${age !== null && age >= 0 ? ` · ~${age} yr${age === 1 ? "" : "s"} old` : ""}`
                        : "Install date unknown"}
                      {eq.notes ? ` · ${eq.notes}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => removeEquipment(eq.id)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-slate-500">
            No equipment logged yet. Add the water heater, panel, or unit you installed —
            future-you will thank present-you.
          </p>
        )}
        <div className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:grid-cols-[1fr_160px]">
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
            <button onClick={addEquipment} disabled={eqSaving} className="btn-secondary !py-2.5 text-sm">
              {eqSaving ? "Saving…" : "+ Log equipment"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-white">Quotes</h3>
          {history.quotes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No quotes for this customer yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.quotes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/dashboard/quotes/${q.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-amber-400/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{q.title}</span>
                      <span className="text-xs text-slate-500">
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
            className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:text-amber-200"
          >
            + New quote
          </Link>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-white">Invoices</h3>
          {history.invoices.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No invoices for this customer yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.invoices.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/dashboard/invoices/${i.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 transition hover:border-amber-400/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-white">{i.title}</span>
                      <span className="text-xs text-slate-500">
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
            className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:text-amber-200"
          >
            + New invoice
          </Link>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-white">Jobs</h3>
          {history.jobs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No jobs scheduled for this customer yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.jobs.map((j) => (
                <li
                  key={j.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{j.title}</span>
                    <span className="text-xs text-slate-500">
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
            className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:text-amber-200"
          >
            Open schedule →
          </Link>
        </div>

        <div className="card p-6">
          <h3 className="font-display text-base font-bold text-white">Reviews</h3>
          {history.reviews.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No review requests for this customer yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {history.reviews.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">
                      {r.job_title || "Review request"}
                    </span>
                    <span className="text-xs text-slate-500">
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
            className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:text-amber-200"
          >
            Open reviews →
          </Link>
        </div>
      </section>
    </div>
  );
}
