"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/store";

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
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="input-dark mb-4"
          aria-label="Search customers"
        />
        {visible.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-display text-lg font-bold text-white">
              {customers.length === 0 ? "No customers yet." : "No matches."}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Every customer you add keeps their full job history — quotes,
              invoices, jobs, and equipment. That&apos;s what wins the repeat.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/customers/${c.id}`}
                  className="card flex items-center justify-between gap-3 p-4 transition hover:border-amber-400/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {[c.phone, c.address].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-amber-300">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card h-fit p-6">
        <h3 className="font-display text-base font-bold text-white">Add a customer</h3>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <div className="mt-4 space-y-3">
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="input-dark"
            />
          </div>
          <button onClick={create} disabled={saving} className="btn-primary w-full text-sm">
            {saving ? "Adding…" : "+ Add customer"}
          </button>
        </div>
      </div>
    </div>
  );
}
