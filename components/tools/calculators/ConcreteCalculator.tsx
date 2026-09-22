"use client";

import { useMemo, useState } from "react";
import { Field, SliderInput, Stat, fmt } from "../ui";
import { DIM, IsoBox, IsoStage, SAFETY, boxCorners, fitIso } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

/**
 * True-proportion slab. Footprint and thickness use the real ratios (thickness
 * clamped so a 4-in slab on a 40-ft driveway is still visible), with a 6-ft
 * figure standing beside it for scale. Auto-fitted, so it never overflows.
 */
function SlabScene({ l, w, tIn }: { l: number; w: number; tIn: number }) {
  const W = 480;
  const H = 260;
  const t = Math.max(tIn / 12, Math.max(l, w) * 0.035); // ft, keep the edge readable
  const figH = 6;
  const gap = Math.max(l, w) * 0.12 + 1;
  const fx = l * 0.5;
  const fy = w + gap + 0.6;
  const corners = [...boxCorners(0, 0, 0, l, w, t), ...boxCorners(fx - 0.6, fy - 0.6, 0, 1.2, 1.2, figH)];
  const pr = fitIso(corners, W, H, 34);
  const { P } = pr;
  // labels
  const lenA = P(0, 0, t);
  const lenB = P(l, 0, t);
  const widA = P(l, 0, 0);
  const widB = P(l, w, 0);
  const thA = P(l, w, 0);
  const thB = P(l, w, t);
  // figure
  const head = P(fx, fy, figH - 0.4);
  const neck = P(fx, fy, figH - 0.9);
  const hip = P(fx, fy, figH * 0.5);
  const footL = P(fx - 0.4, fy + 0.3, 0);
  const footR = P(fx + 0.4, fy - 0.3, 0);
  const handL = P(fx - 0.6, fy + 0.4, figH * 0.5);
  const handR = P(fx + 0.6, fy - 0.4, figH * 0.5);
  const sh = P(fx, fy, figH - 1.2);
  const headR = Math.max(pr.k * 0.4, 3);
  const grid = Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(l, w)))) / 2);
  const gridLines: string[] = [];
  for (let gx = grid; gx < l; gx += grid) gridLines.push(pr.pts([gx, 0, t], [gx, w, t]));
  for (let gy = grid; gy < w; gy += grid) gridLines.push(pr.pts([0, gy, t], [l, gy, t]));

  return (
    <IsoStage W={W} H={H} label={`Slab ${fmt(l)} by ${fmt(w)} feet, ${fmt(tIn)} inches thick`}>
      {/* ground shadow */}
      <polygon
        points={pr.pts([-l * 0.05, -w * 0.05, 0], [l * 1.05, -w * 0.05, 0], [l * 1.05, w * 1.05, 0], [-l * 0.05, w * 1.05, 0])}
        fill="#0f1116"
      />
      <IsoBox pr={pr} x={0} y={0} z={0} dx={l} dy={w} dz={t} top="#4a4f5c" topStroke={SAFETY} />
      {gridLines.map((g, i) => (
        <polyline key={i} points={g} fill="none" stroke="#6b7080" strokeWidth={0.75} opacity={0.5} />
      ))}
      {/* figure for scale */}
      <g stroke="#e6e8eb" strokeWidth={Math.max(pr.k * 0.18, 2)} strokeLinecap="round" fill="none">
        <line x1={neck.x} y1={neck.y} x2={hip.x} y2={hip.y} />
        <line x1={hip.x} y1={hip.y} x2={footL.x} y2={footL.y} />
        <line x1={hip.x} y1={hip.y} x2={footR.x} y2={footR.y} />
        <line x1={sh.x} y1={sh.y} x2={handL.x} y2={handL.y} />
        <line x1={sh.x} y1={sh.y} x2={handR.x} y2={handR.y} />
      </g>
      <circle cx={head.x} cy={head.y} r={headR} fill="#e6e8eb" />
      {/* dimension labels */}
      <text x={(lenA.x + lenB.x) / 2 + 10} y={(lenA.y + lenB.y) / 2 - 10} fill={SAFETY} fontSize={14} fontWeight={800} textAnchor="start">
        {fmt(l)} ft
      </text>
      <text x={(widA.x + widB.x) / 2 + 12} y={(widA.y + widB.y) / 2 - 4} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="start">
        {fmt(w)} ft
      </text>
      <text x={thA.x + 10} y={(thA.y + thB.y) / 2 + 18} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        {fmt(tIn)} in thick
      </text>
      <text x={W - 12} y={H - 10} fill="#565b64" fontSize={10} fontWeight={700} textAnchor="end">
        Figure is 6 ft · grid every {fmt(grid)} ft
      </text>
    </IsoStage>
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
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Length" hint="Drag, or type an exact figure.">
          <SliderInput value={length} onChange={setLength} min={1} max={60} step={0.5} suffix="ft" ariaLabel="Length in feet" />
        </Field>
        <Field label="Width">
          <SliderInput value={width} onChange={setWidth} min={1} max={60} step={0.5} suffix="ft" ariaLabel="Width in feet" />
        </Field>
        <Field label="Thickness" hint="4 in for patios and walkways, 6 in for driveways, 8 in for heavy loads.">
          <SliderInput value={thick} onChange={setThick} min={2} max={12} step={0.5} suffix="in" ariaLabel="Thickness in inches" />
        </Field>
      </div>

      {result ? (
        <div className="mt-2">
          <SlabScene l={result.l} w={result.w} tIn={result.t} />
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
