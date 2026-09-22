"use client";

import { useState } from "react";
import { formatUSD, type LineItem, type LineItemKind } from "@/lib/money";
import { IconPlus, IconX } from "./icons";

/**
 * LineItemsEditor — shared labor/materials line-item editor for quotes and
 * invoices. Manages its own list state and reports changes upward.
 */
export default function LineItemsEditor({
  initial,
  onChange,
}: {
  initial: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const [items, setItems] = useState<LineItem[]>(
    initial.length > 0
      ? initial
      : [{ description: "", qty: 1, unit_price: 0, kind: "labor" }]
  );

  function update(next: LineItem[]) {
    setItems(next);
    onChange(next);
  }

  function setField(i: number, field: keyof LineItem, value: string | number) {
    const next = items.map((it, idx) =>
      idx === i
        ? {
            ...it,
            [field]:
              field === "qty" || field === "unit_price"
                ? Math.max(0, Number(value) || 0)
                : value,
          }
        : it
    );
    update(next);
  }

  function addRow(kind: LineItemKind) {
    update([...items, { description: "", qty: 1, unit_price: 0, kind }]);
  }

  function removeRow(i: number) {
    if (items.length === 1) {
      update([{ description: "", qty: 1, unit_price: 0, kind: "labor" }]);
      return;
    }
    update(items.filter((_, idx) => idx !== i));
  }

  const labor = items.filter((i) => i.kind === "labor");
  const materials = items.filter((i) => i.kind === "materials");

  function Group({
    label,
    kind,
    rows,
  }: {
    label: string;
    kind: LineItemKind;
    rows: { item: LineItem; index: number }[];
  }) {
    const subtotal = rows.reduce((s, r) => s + r.item.qty * r.item.unit_price, 0);
    return (
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="stat-label !text-bone-300">{label}</h4>
          <button
            type="button"
            onClick={() => addRow(kind)}
            className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-xl border-2 border-dashed border-ink-600 px-4 text-sm font-bold text-safety-300 transition hover:border-safety-500/60 hover:bg-safety-500/10 active:scale-[0.97]"
          >
            <IconPlus className="h-4 w-4" /> Add {label.toLowerCase()} line
          </button>
        </div>
        {rows.length === 0 && (
          <p className="rounded-xl border-2 border-dashed border-ink-700 px-4 py-4 text-sm text-bone-500">
            No {label.toLowerCase()} lines yet.
          </p>
        )}
        <div className="space-y-2.5">
          {rows.map(({ item, index }) => (
            <div
              key={index}
              className="rounded-xl border-2 border-ink-600 bg-ink-900 p-3 transition focus-within:border-safety-500/60"
            >
              <div className="flex items-start gap-2">
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => setField(index, "description", e.target.value)}
                  placeholder={
                    kind === "labor" ? "e.g. Install labor — 3 hrs" : "e.g. 50-gal water heater"
                  }
                  aria-label={`${label} description`}
                  className="input-dark min-h-[48px] flex-1 border-0 !bg-transparent !px-1 text-[15px] font-semibold focus:!ring-0"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Remove line"
                  className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-bone-500 transition hover:bg-alert-400/10 hover:text-alert-300 active:scale-95"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 grid grid-cols-3 items-center gap-2">
                <div>
                  <label className="sr-only" htmlFor={`qty-${index}`}>Quantity</label>
                  <input
                    id={`qty-${index}`}
                    type="number"
                    min={0}
                    step="any"
                    value={item.qty}
                    onChange={(e) => setField(index, "qty", e.target.value)}
                    placeholder="Qty"
                    className="input-dark min-h-[48px] !px-3 text-center"
                  />
                </div>
                <div>
                  <label className="sr-only" htmlFor={`price-${index}`}>Unit price</label>
                  <input
                    id={`price-${index}`}
                    type="number"
                    min={0}
                    step="any"
                    value={item.unit_price}
                    onChange={(e) => setField(index, "unit_price", e.target.value)}
                    placeholder="$ each"
                    className="input-dark min-h-[48px] !px-3 text-center"
                  />
                </div>
                <p className="text-right font-display text-xl tracking-wide text-paper">
                  {formatUSD(item.qty * item.unit_price)}
                </p>
              </div>
            </div>
          ))}
        </div>
        {rows.length > 0 && (
          <p className="mt-2.5 text-right text-sm text-bone-400">
            {label} subtotal:{" "}
            <span className="font-bold text-bone-200">{formatUSD(subtotal)}</span>
          </p>
        )}
        <span className="hidden">
          {labor.length}
          {materials.length}
        </span>
      </div>
    );
  }

  const indexed = items.map((item, index) => ({ item, index }));

  return (
    <div>
      <Group
        label="Labor"
        kind="labor"
        rows={indexed.filter((r) => r.item.kind === "labor")}
      />
      <Group
        label="Materials"
        kind="materials"
        rows={indexed.filter((r) => r.item.kind === "materials")}
      />
    </div>
  );
}
