"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/store";
import { useToast } from "./Toast";
import CustomerImport from "./CustomerImport";
import { IconCustomers, IconPlus, IconSearch } from "./icons";

/**
 * CustomersClient — the customer list, and the fastest possible way to add
 * someone to it.
 *
 * The add form is the thing that matters here. A contractor uses it standing
 * in a driveway on a phone with a name and a number, so: a real <form> (Enter
 * submits), nothing required but the name, the optional fields folded away
 * until asked for, and two exits — back to the briefing, or straight into
 * adding the next one.
 */
export default function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const nameInput = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visible = customers.filter((c) =>
    search.trim()
      ? c.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        c.phone.toLowerCase().includes(search.trim().toLowerCase())
      : true
  );

  function reset() {
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setShowMore(false);
    setError("");
  }

  /**
   * `again` keeps the contractor here with a cleared form. Otherwise they go
   * back to the briefing — the app's home screen, and where the setup
   * checklist that sent them here lives.
   */
  async function create(again: boolean) {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter at least a name — everything else can wait.");
      nameInput.current?.focus();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the customer.");
        return;
      }

      toast(`${trimmed} added.`);
      reset();
      router.refresh();

      if (again) {
        nameInput.current?.focus();
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:gap-8">
      {/* Add form. `order-first` on mobile: on a phone the list can be a
          hundred rows long, and burying the add button under all of them is
          how you make a thirty-second job feel like a chore. On desktop it
          sits in the sidebar where there's room for both. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create(false);
        }}
        className="card order-first h-fit p-5 sm:p-6 lg:order-last lg:sticky lg:top-24"
      >
        <h3 className="font-display text-xl uppercase tracking-wide text-paper">
          Add a customer
        </h3>
        <p className="mt-1.5 text-sm leading-relaxed text-bone-400">
          A name is enough to start. You can fill in the rest any time.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300"
          >
            {error}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="nc-name" className="label-dark">
              Name
            </label>
            <input
              id="nc-name"
              ref={nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Miller"
              autoComplete="name"
              enterKeyHint="done"
              className="input-dark"
            />
          </div>
          <div>
            <label htmlFor="nc-phone" className="label-dark">
              Phone <span className="font-normal normal-case text-bone-600">— optional</span>
            </label>
            <input
              id="nc-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              autoComplete="tel"
              enterKeyHint="done"
              className="input-dark"
            />
          </div>

          {/* Folded away by default: two fields on screen reads as a
              thirty-second job, six reads as paperwork. */}
          {showMore ? (
            <>
              <div>
                <label htmlFor="nc-email" className="label-dark">
                  Email <span className="font-normal normal-case text-bone-600">— optional</span>
                </label>
                <input
                  id="nc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                  className="input-dark"
                />
              </div>
              <div>
                <label htmlFor="nc-address" className="label-dark">
                  Address <span className="font-normal normal-case text-bone-600">— optional</span>
                </label>
                <input
                  id="nc-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="412 Alder St"
                  autoComplete="street-address"
                  className="input-dark"
                />
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="btn-ghost !min-h-[40px] !px-0 text-sm"
            >
              + Add email and address
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full text-base"
          >
            <IconPlus className="h-5 w-5" />
            {saving ? "Saving…" : "Add customer"}
          </button>
          <button
            type="button"
            onClick={() => create(true)}
            disabled={saving}
            className="btn-secondary w-full !min-h-[44px] text-sm"
          >
            Save &amp; add another
          </button>
          <p className="text-center text-xs leading-relaxed text-bone-600">
            Adding takes you back to your briefing.
          </p>

          {/* Got a list already? Don't retype it. */}
          <div className="border-t-2 border-ink-700 pt-4">
            <CustomerImport />
          </div>
        </div>
      </form>

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
            <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-bone-300">
              {customers.length === 0
                ? "Every customer you add keeps their full job history — quotes, invoices, jobs and equipment. That's what wins the repeat."
                : "Nothing matches that search. Check the spelling, or clear it to see everyone."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-bone-500">
              {visible.length} customer{visible.length === 1 ? "" : "s"}
              {search.trim() ? ` matching “${search.trim()}”` : ""}
            </p>
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
          </>
        )}
      </div>
    </div>
  );
}
