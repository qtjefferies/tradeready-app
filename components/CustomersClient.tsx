"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/store";
import { IconCustomers, IconPlus, IconSearch } from "./icons";

/** CustomersClient — customer list with search and inline create. */
export default function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visible = customers.filter((c) =>
    search.trim()
      ? c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        c.phone.toLowerCase().includes(search.trim().toLowerCase())
      : true
  );

  async function create() {
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create the customer.");
        return;
      }
      router.push(`/dashboard/customers/${data.id}`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
      <div>
        <div className="relative mb-4">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-bone-500">
            <IconSearch className="h-5 w-5" />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="input-dark !pl-12"
            aria-label="Search customers"
          />
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
              <IconCustomers className="h-8 w-8" />
            </span>
            <p className="mt-5 font-display text-2xl uppercase tracking-wide text-paper">
              {customers.length === 0 ? "No customers yet." : "No matches."}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-bone-300">
              Every customer you add keeps their full job history — quotes,
              invoices, jobs, and equipment. That&apos;s what wins the repeat.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/customers/${c.id}`}
                  className="card flex min-h-[72px] touch-manipulation items-center justify-between gap-3 p-4 transition hover:border-safety-500/40 active:scale-[0.995] sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-paper">{c.name}</p>
                    <p className="mt-0.5 truncate text-sm text-bone-400">
                      {[c.phone, c.address].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-sm uppercase tracking-wide text-safety-300">
                    Open →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card h-fit p-5 sm:p-6 lg:sticky lg:top-24">
        <h3 className="font-display text-xl uppercase tracking-wide text-paper">Add a customer</h3>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300">
            {error}
          </p>
        )}
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="nc-name" className="label-dark">Name</label>
            <input
              id="nc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Miller"
              className="input-dark"
            />
          </div>
          <div>
            <label htmlFor="nc-phone" className="label-dark">Phone</label>
            <input
              id="nc-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="input-dark"
            />
          </div>
          <button onClick={create} disabled={saving} className="btn-primary w-full text-base">
            <IconPlus className="h-5 w-5" /> {saving ? "Adding…" : "Add customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
