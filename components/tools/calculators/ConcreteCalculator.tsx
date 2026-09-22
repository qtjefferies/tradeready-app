"use client";

import { useMemo, useState } from "react";
import { Field, NumInput, Stat, fmt } from "../ui";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

const SAFETY = "#f5b83d";
const DIM = "#8a8fa0";

/** Isometric slab: top face lighter, length/width/depth labeled. */
function SlabDiagram({ l, w, tIn }: { l: number; w: number; tIn: number }) {
  const W = 400;
  const H = 230;
  // Fit the footprint into the viewBox.
  const s = Math.min(200 / Math.max(l, 0.5), 96 / Math.max(w, 0.5), 1.6);
  const ox = 84;
  const oy = 96;
  const L = { x: 190 * s, y: 56 * s };
  const Wv = { x: 84 * s, y: -48 * s };
  const D = { x: 0, y: 34 };
  const P = (bx: number, by: number) => `${bx},${by}`;
  const O = { x: ox, y: oy };
  const A = { x: ox + L.x, y: oy + L.y };
  const B = { x: ox + L.x + Wv.x, y: oy + L.y + Wv.y };
  const C = { x: ox + Wv.x, y: oy + Wv.y };
  const Od = { x: O.x + D.x, y: O.y + D.y };
  const Ad = { x: A.x + D.x, y: A.y + D.y };
  const Bd = { x: B.x + D.x, y: B.y + D.y };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" role="img" aria-label="Slab diagram">
      {/* right face */}
      <polygon
        points={`${P(A.x, A.y)} ${P(B.x, B.y)} ${P(Bd.x, Bd.y)} ${P(Ad.x, Ad.y)}`}
        fill="#23262e"
        stroke={DIM}
        strokeWidth={1.5}
      />
      {/* front face */}
      <polygon
        points={`${P(O.x, O.y)} ${P(A.x, A.y)} ${P(Ad.x, Ad.y)} ${P(Od.x, Od.y)}`}
        fill="#2c303a"
        stroke={DIM}
        strokeWidth={1.5}
      />
      {/* top face */}
      <polygon
        points={`${P(O.x, O.y)} ${P(A.x, A.y)} ${P(B.x, B.y)} ${P(C.x, C.y)}`}
        fill="#3a3f4c"
        stroke={SAFETY}
        strokeWidth={2}
      />
      {/* length label */}
      <text x={(Od.x + Ad.x) / 2} y={(Od.y + Ad.y) / 2 + 22} fill={SAFETY} fontSize={14} fontWeight={800} textAnchor="middle">
        {fmt(l)} ft
      </text>
      {/* width label */}
      <text x={(A.x + B.x) / 2 + 8} y={(A.y + B.y) / 2 - 8} fill={DIM} fontSize={12} fontWeight={700} textAnchor="middle">
        {fmt(w)} ft
      </text>
      {/* depth label */}
      <text
        x={(O.x + Od.x) / 2 - 12}
        y={(O.y + Od.y) / 2}
        fill={DIM}
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
        transform={`rotate(-90 ${(O.x + Od.x) / 2 - 12} ${(O.y + Od.y) / 2})`}
      >
        {fmt(tIn)} in
      </text>
    </svg>
  );
}

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
      l,
      w,
      t,
      cuyd,
      order,
      bags80: Math.ceil(withWaste / 0.6),
      bags60: Math.ceil(withWaste / 0.45),
      bags40: Math.ceil(withWaste / 0.3),
    };
  }, [length, width, thick]);

  const buildPayload = (): ToolQuotePayload | null => {
    if (!result) return null;
    return {
      source: "Concrete calculator",
      sourceHref: "/tools/general/concrete-calculator",
      title: `Concrete slab — ${fmt(result.l)}×${fmt(result.w)} ft`,
      notes:
        `Slab ${fmt(result.l)} × ${fmt(result.w)} ft, ${fmt(result.t)} in thick.\n` +
        `Order ${fmt(result.order)} yd³ (10% waste included) or ${fmt(result.bags80)} × 80-lb bags.\n` +
        `Add your material price and labor below.`,
      lines: [
        {
          description: `Concrete — ${fmt(result.order)} yd³ delivered (10% waste incl.)`,
          qty: Math.round(result.order * 100) / 100,
          unit_price: 0,
          kind: "materials",
        },
        { description: "Concrete labor — forming, pouring, finishing", qty: 1, unit_price: 0, kind: "labor" },
      ],
    };
  };

  const resultText = result
    ? `Concrete slab ${fmt(result.l)}×${fmt(result.w)} ft × ${fmt(result.t)} in → order ${fmt(result.order)} yd³ (${fmt(result.bags80)} × 80-lb bags).`
    : "";

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
        <div className="mt-2">
          <SlabDiagram l={result.l} w={result.w} tIn={result.t} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter dimensions to get your order.</p>
      )}
    </div>
  );
}
