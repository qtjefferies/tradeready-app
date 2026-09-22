"use client";

import { useState } from "react";
import { formatUSD, type LineItem, type LineItemKind } from "@/lib/money";
import { IconPlus, IconX } from "./icons";

/**
 * LineItemsEditor — shared labor/materials line-item editor for quotes and
 * invoices.
 *
 * Every row can be priced two ways:
 *
 *   Flat        one dollar box. "Water heater, $1,290." This is how most
 *               trades quote most lines, and pushing a single number through
 *               a "qty 1 × $1,290 each" grid made it feel like a form.
 *   Qty × rate  for anything genuinely per-unit: 4 hrs at $140, 60 ft at $9.
 *
 * Flat is a DISPLAY mode, not a new data shape: it stores qty = 1 and puts
 * the amount in unit_price, so 1 × amount = amount. Nothing downstream
 * changes — the PDF, the totals, and the server's authoritative recomputation
 * all read the same LineItem they always did.
 *
 * NOTE ON STRUCTURE: `Row` and `Group` are declared at module scope on
 * purpose. `Group` used to live inside the component body, which meant React
 * saw a brand-new component type on every render, unmounted the subtree and
 * remounted it — so the field being typed in lost focus after every single
 * character. Keep them out here.
 */

interface RowProps {
  item: LineItem;
  index: number;
  label: string;
  kind: LineItemKind;
  flat: boolean;
  onField: (i: number, field: keyof LineItem, value: string | number) => void;
  onToggleFlat: (i: number) => void;
  onRemove: (i: number) => void;
}

function Row({
  item,
  index,
  label,
  kind,
  flat,
  onField,
  onToggleFlat,
  onRemove,
}: RowProps) {
  return (
    <div className="rounded-xl border-2 border-ink-600 bg-ink-900 p-3 transition focus-within:border-safety-500/60">
      <div className="flex items-start gap-2">
        <input
          type="text"
          value={item.description}
          onChange={(e) => onField(index, "description", e.target.value)}
          placeholder={
            kind === "labor"
              ? "e.g. Install labor — 3 hrs"
              : "e.g. 50-gal water heater"
          }
          aria-label={`${label} description`}
          className="input-dark min-h-[48px] flex-1 border-0 !bg-transparent !px-1 text-[15px] font-semibold focus:!ring-0"
        />
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label="Remove line"
          className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-bone-500 transition hover:bg-alert-400/10 hover:text-alert-300 active:scale-95"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      {flat ? (
        <div className="mt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <label className="sr-only" htmlFor={`amount-${index}`}>
              Amount in dollars
            </label>
            <span
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-display text-xl text-bone-500"
              aria-hidden="true"
            >
              $
            </span>
            <input
              id={`amount-${index}`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={item.unit_price || ""}
              onChange={(e) => onField(index, "unit_price", e.target.value)}
              placeholder="0.00"
              className="input-dark min-h-[52px] !pl-9 font-display text-xl tracking-wide"
            />
          </div>
          <button
            type="button"
            onClick={() => onToggleFlat(index)}
            className="shrink-0 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wide text-bone-500 transition hover:text-safety-300"
          >
            Qty × rate
          </button>
        </div>
      ) : (
        <>
          <div className="mt-1 grid grid-cols-3 items-center gap-2">
            <div>
              <label className="sr-only" htmlFor={`qty-${index}`}>
                Quantity
              </label>
              <input
                id={`qty-${index}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={item.qty}
                onChange={(e) => onField(index, "qty", e.target.value)}
                placeholder="Qty"
                className="input-dark min-h-[48px] !px-3 text-center"
              />
            </div>
            <div>
              <label className="sr-only" htmlFor={`price-${index}`}>
                Unit price
              </label>
              <input
                id={`price-${index}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={item.unit_price}
                onChange={(e) => onField(index, "unit_price", e.target.value)}
                placeholder="$ each"
                className="input-dark min-h-[48px] !px-3 text-center"
              />
            </div>
            <p className="text-right font-display text-xl tracking-wide text-paper">
              {formatUSD(item.qty * item.unit_price)}
            </p>
          </div>
          <div className="mt-1 text-right">
            <button
              type="button"
              onClick={() => onToggleFlat(index)}
              className="rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-bone-500 transition hover:text-safety-300"
            >
              Use a flat amount
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface GroupProps {
  label: string;
  kind: LineItemKind;
  rows: { item: LineItem; index: number }[];
  isFlat: (i: number) => boolean;
  onAdd: (kind: LineItemKind) => void;
  onField: RowProps["onField"];
  onToggleFlat: RowProps["onToggleFlat"];
  onRemove: RowProps["onRemove"];
}

function Group({
  label,
  kind,
  rows,
  isFlat,
  onAdd,
  onField,
  onToggleFlat,
  onRemove,
}: GroupProps) {
  const subtotal = rows.reduce((s, r) => s + r.item.qty * r.item.unit_price, 0);

  // An empty group is one quiet button, not a heading plus an add button plus
  // a paragraph explaining that it's empty. Most quotes never touch
  // materials, and three lines of chrome telling you so is three lines of
  // work that isn't yours.
  if (rows.length === 0) {
    return (
      <div className="mb-4">
        <button
          type="button"
          onClick={() => onAdd(kind)}
          className="inline-flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink-700 px-4 text-sm font-bold text-bone-400 transition hover:border-safety-500/50 hover:text-safety-300 active:scale-[0.99]"
        >
          <IconPlus className="h-4 w-4" /> Add {label.toLowerCase()}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="stat-label !text-bone-300">{label}</h4>
        <button
          type="button"
          onClick={() => onAdd(kind)}
          className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-xl border-2 border-dashed border-ink-600 px-4 text-sm font-bold text-safety-300 transition hover:border-safety-500/60 hover:bg-safety-500/10 active:scale-[0.97]"
        >
          <IconPlus className="h-4 w-4" /> Add {label.toLowerCase()} line
        </button>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ item, index }) => (
          <Row
            key={index}
            item={item}
            index={index}
            label={label}
            kind={kind}
            flat={isFlat(index)}
            onField={onField}
            onToggleFlat={onToggleFlat}
            onRemove={onRemove}
          />
        ))}
      </div>
      {/* Only worth showing once it's actually adding something up. */}
      {rows.length > 1 && (
        <p className="mt-2.5 text-right text-sm text-bone-400">
          {label} subtotal:{" "}
          <span className="font-bold text-bone-200">{formatUSD(subtotal)}</span>
        </p>
      )}
    </div>
  );
}

const blankRow = (kind: LineItemKind = "labor"): LineItem => ({
  description: "",
  qty: 1,
  unit_price: 0,
  kind,
});

export default function LineItemsEditor({
  initial,
  onChange,
}: {
  initial: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  const [items, setItems] = useState<LineItem[]>(
    initial.length > 0 ? initial : [blankRow()]
  );

  /**
   * Row indices currently shown as a single dollar box. A row that arrives
   * with qty === 1 is arithmetically identical to a flat one, so it opens
   * flat — which is also the common case.
   */
  const [flatRows, setFlatRows] = useState<Set<number>>(
    () =>
      new Set(
        (initial.length > 0 ? initial : [blankRow()])
          .map((it, i) => (it.qty === 1 ? i : -1))
          .filter((i) => i >= 0)
      )
  );

  const isFlat = (i: number) => flatRows.has(i);

  function update(next: LineItem[]) {
    setItems(next);
    onChange(next);
  }

  function setField(i: number, field: keyof LineItem, value: string | number) {
    update(
      items.map((it, idx) =>
        idx === i
          ? {
              ...it,
              [field]:
                field === "qty" || field === "unit_price"
                  ? Math.max(0, Number(value) || 0)
                  : value,
            }
          : it
      )
    );
  }

  /**
   * Switching to flat collapses qty × rate into one number, so the amount on
   * screen never changes underneath the contractor — a row reading "3 × $120"
   * becomes a flat "$360", not a flat "$120".
   */
  function toggleFlat(i: number) {
    const goingFlat = !isFlat(i);
    if (goingFlat) {
      const row = items[i];
      const amount = Math.round(row.qty * row.unit_price * 100) / 100;
      update(
        items.map((it, idx) =>
          idx === i ? { ...it, qty: 1, unit_price: amount } : it
        )
      );
    }
    setFlatRows((prev) => {
      const next = new Set(prev);
      if (goingFlat) next.add(i);
      else next.delete(i);
      return next;
    });
  }

  function addRow(kind: LineItemKind) {
    // New rows start flat: one box, type the money, move on.
    setFlatRows((prev) => new Set(prev).add(items.length));
    update([...items, blankRow(kind)]);
  }

  function removeRow(i: number) {
    if (items.length === 1) {
      setFlatRows(new Set([0]));
      update([blankRow()]);
      return;
    }
    // Indices shift left past the removed row, so the flat set shifts with
    // them — otherwise deleting row 0 silently re-modes every row below it.
    setFlatRows((prev) => {
      const next = new Set<number>();
      prev.forEach((idx) => {
        if (idx < i) next.add(idx);
        else if (idx > i) next.add(idx - 1);
      });
      return next;
    });
    update(items.filter((_, idx) => idx !== i));
  }

  const indexed = items.map((item, index) => ({ item, index }));
  const shared = {
    isFlat,
    onAdd: addRow,
    onField: setField,
    onToggleFlat: toggleFlat,
    onRemove: removeRow,
  };

  return (
    <div>
      <Group
        label="Labor"
        kind="labor"
        rows={indexed.filter((r) => r.item.kind === "labor")}
        {...shared}
      />
      <Group
        label="Materials"
        kind="materials"
        rows={indexed.filter((r) => r.item.kind === "materials")}
        {...shared}
      />
    </div>
  );
}
