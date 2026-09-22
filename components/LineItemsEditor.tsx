"use client";

import { useState } from "react";
import { formatUSD, type LineItem, type LineItemKind } from "@/lib/money";

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
    return (
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {label}
          </h4>
          <button
            type="button"
            onClick={() => addRow(kind)}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200"
          >
            + Add {label.toLowerCase()} line
          </button>
        </div>
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-xs text-slate-500">
            No {label.toLowerCase()} lines yet.
          </p>
        )}
        <div className="space-y-2">
          {rows.map(({ item, index }) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-white/10 bg-black/30 p-3 sm:grid-cols-[1fr_90px_110px_90px_auto] sm:items-center"
            >
              <input
                type="text"
                value={item.description}
                onChange={(e) => setField(index, "description", e.target.value)}
                placeholder={
                  kind === "labor" ? "e.g. Install labor — 3 hrs" : "e.g. 50-gal water heater"
                }
                className="input-dark col-span-2 !py-2 text-sm sm:col-span-1"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={item.qty}
                onChange={(e) => setField(index, "qty", e.target.value)}
                aria-label="Quantity"
                title="Qty"
                className="input-dark !py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step="any"
                value={item.unit_price}
                onChange={(e) => setField(index, "unit_price", e.target.value)}
                aria-label="Unit price"
                title="Unit price ($)"
                placeholder="$ each"
                className="input-dark !py-2 text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-semibold text-slate-200">
                  {formatUSD(item.qty * item.unit_price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  aria-label="Remove line"
                  className="rounded-lg px-2 py-1 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        {rows.length > 0 && (
          <p className="mt-2 text-right text-xs text-slate-500">
            {label} subtotal:{" "}
            <span className="font-semibold text-slate-300">
              {formatUSD(
                rows.reduce((s, r) => s + r.item.qty * r.item.unit_price, 0)
              )}
            </span>
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
