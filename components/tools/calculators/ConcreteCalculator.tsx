"use client";

import { useMemo, useState } from "react";
import { Field, NumInput, Stat, fmt } from "../ui";

export default function ConcreteCalculator() {
  const [length, setLength] = useState("10");
  const [width, setWidth] = useState("10");
  const [thick, setThick] = useState("4");

  const result = useMemo(() => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const t = parseFloat(thick);
    if (![l, w, t].every((n) => isFinite(n) && n > 0)) return null;
    const cuft = (l * w * t) / 12;
    const cuyd = cuft / 27;
    const order = cuyd * 1.1; // 10% waste
    const withWaste = cuft * 1.05;
    return {
      cuyd,
      order,
      bags80: Math.ceil(withWaste / 0.6),
      bags60: Math.ceil(withWaste / 0.45),
      bags40: Math.ceil(withWaste / 0.3),
    };
  }, [length, width, thick]);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Length" hint="In feet.">
          <NumInput value={length} onChange={setLength} min={0.5} suffix="ft" ariaLabel="Length in feet" />
        </Field>
        <Field label="Width" hint="In feet.">
          <NumInput value={width} onChange={setWidth} min={0.5} suffix="ft" ariaLabel="Width in feet" />
        </Field>
        <Field label="Thickness" hint="Slab depth in inches — 4 in for patios, 6 in for driveways.">
          <NumInput value={thick} onChange={setThick} min={1} suffix="in" ariaLabel="Thickness in inches" />
        </Field>
      </div>

      {result ? (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat
              label="Order this much"
              value={`${fmt(result.order)} yd³`}
              sub={`${fmt(result.cuyd)} yd³ exact + 10% waste — shorting a pour is the expensive mistake`}
              highlight
            />
            <Stat
              label="Or by the bag (80 lb)"
              value={`${fmt(result.bags80)} bags`}
              sub="Each 80-lb bag ≈ 0.6 ft³ · 5% waste included"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Stat label="60-lb bags" value={`${fmt(result.bags60)} bags`} sub="Each ≈ 0.45 ft³" />
            <Stat label="40-lb bags" value={`${fmt(result.bags40)} bags`} sub="Each ≈ 0.30 ft³" />
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter dimensions to get your order.</p>
      )}
    </div>
  );
}
