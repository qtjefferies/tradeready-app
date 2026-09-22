"use client";

import { useRef, useState } from "react";
import type { Customer } from "@/lib/store";
import { useToast } from "./Toast";
import { IconPlus, IconX } from "./icons";

/**
 * CustomerPicker — choose an existing customer, or create one without
 * leaving the page.
 *
 * The moment a contractor most often meets someone new is while quoting for
 * them. Before this, the only in-place option was a free-text name, which
 * left `customer_id` null: the quote wasn't attached to anybody, so it never
 * showed up in their history and Money Found could never see them again.
 * The convenient choice quietly broke the retention feature, which is the
 * worst kind of trade-off to put in front of someone.
 *
 * The one-off name is still here for genuine walk-ups — it's just no longer
 * the path of least resistance.
 */

export interface CustomerSelection {
  id: number | null;
  name: string;
}

export default function CustomerPicker({
  customers,
  value,
  onChange,
  idPrefix = "cust",
}: {
  customers: Customer[];
  value: CustomerSelection;
  onChange: (v: CustomerSelection) => void;
  /** Keeps input ids unique when two pickers share a page. */
  idPrefix?: string;
}) {
  const { toast } = useToast();
  const newNameInput = useRef<HTMLInputElement>(null);

  // Local copy so a customer created here appears in the list immediately,
  // without a round trip through the server component that supplied it.
  const [list, setList] = useState<Customer[]>(customers);
  const [creating, setCreating] = useState(false);
  const [oneOff, setOneOff] = useState(value.id === null && value.name !== "");

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const ONE_OFF = "__one_off__";

  function handleSelect(v: string) {
    if (v === ONE_OFF) {
      setOneOff(true);
      onChange({ id: null, name: "" });
      return;
    }
    setOneOff(false);
    if (!v) {
      onChange({ id: null, name: "" });
      return;
    }
    const picked = list.find((c) => String(c.id) === v);
    onChange({ id: picked?.id ?? null, name: picked?.name ?? "" });
  }

  async function createCustomer() {
    const trimmed = newName.trim();
    if (!trimmed) {
      setError("Enter a name.");
      newNameInput.current?.focus();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, phone: newPhone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the customer.");
        return;
      }
      const created = data.customer as Customer;
      setList((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      onChange({ id: created.id, name: created.name });
      setOneOff(false);
      setCreating(false);
      setNewName("");
      setNewPhone("");
      toast(`${created.name} added and attached to this quote.`);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectValue = oneOff ? ONE_OFF : value.id ? String(value.id) : "";

  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${idPrefix}-select`} className="label-dark">
            Customer
          </label>
          <select
            id={`${idPrefix}-select`}
            value={selectValue}
            onChange={(e) => handleSelect(e.target.value)}
            className="input-dark"
          >
            <option value="">— Choose a customer —</option>
            {list.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={ONE_OFF}>Type a one-off name…</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating((v) => !v);
            setError("");
            // Focus after the field has mounted.
            setTimeout(() => newNameInput.current?.focus(), 0);
          }}
          aria-expanded={creating}
          className="flex min-h-[52px] shrink-0 touch-manipulation items-center gap-1.5 rounded-xl border-2 border-safety-500/50 bg-safety-500/10 px-4 text-sm font-bold text-safety-300 transition hover:bg-safety-500/20 active:scale-[0.97]"
        >
          {creating ? <IconX className="h-4 w-4" /> : <IconPlus className="h-4 w-4" />}
          <span className="hidden sm:inline">{creating ? "Cancel" : "New"}</span>
        </button>
      </div>

      {/* Inline create */}
      {creating && (
        <div className="mt-3 rounded-xl border-2 border-safety-500/40 bg-safety-500/[0.07] p-4">
          <p className="font-display text-base uppercase tracking-wide text-paper">
            New customer
          </p>
          <p className="mt-1 text-sm text-bone-400">
            Saved to your customer list and attached to this quote.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-lg border-2 border-alert-400/40 bg-alert-400/10 px-3 py-2 text-sm font-semibold text-alert-300"
            >
              {error}
            </p>
          )}

          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor={`${idPrefix}-new-name`} className="label-dark">
                Name
              </label>
              <input
                id={`${idPrefix}-new-name`}
                ref={newNameInput}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  // Enter saves. The picker often sits inside another form,
                  // so this must not bubble up and submit the quote.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createCustomer();
                  }
                }}
                placeholder="e.g. Jane Miller"
                autoComplete="off"
                className="input-dark"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-new-phone`} className="label-dark">
                Phone <span className="font-normal normal-case text-bone-600">— optional</span>
              </label>
              <input
                id={`${idPrefix}-new-phone`}
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createCustomer();
                  }
                }}
                placeholder="(555) 123-4567"
                autoComplete="off"
                className="input-dark"
              />
            </div>
            <button
              type="button"
              onClick={createCustomer}
              disabled={saving}
              className="btn-primary w-full text-base"
            >
              {saving ? "Saving…" : "Save & use"}
            </button>
          </div>
        </div>
      )}

      {/* One-off name, for a genuine walk-up you'll never see again. */}
      {oneOff && !creating && (
        <div className="mt-3">
          <label htmlFor={`${idPrefix}-oneoff`} className="label-dark">
            One-off customer name
          </label>
          <input
            id={`${idPrefix}-oneoff`}
            value={value.name}
            onChange={(e) => onChange({ id: null, name: e.target.value })}
            placeholder="e.g. Jane Miller"
            className="input-dark"
          />
          <p className="mt-1.5 text-sm leading-relaxed text-bone-500">
            This name prints on the quote but won&apos;t be saved as a customer
            — no history, and it won&apos;t show up in Money Found later. Use{" "}
            <span className="font-semibold text-bone-300">New</span> if
            you&apos;ll ever work for them again.
          </p>
        </div>
      )}
    </div>
  );
}
