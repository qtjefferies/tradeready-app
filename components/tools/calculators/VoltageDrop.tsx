"use client";

import { useMemo, useState } from "react";
import { Field, NumInput, Seg, Stat, fmt } from "../ui";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Phase = "single" | "three";
type Material = "cu" | "al";

/** Circular mils per NEC Chapter 9, Table 8. */
const SIZES: { label: string; cm: number }[] = [
  { label: "14 AWG", cm: 4110 },
  { label: "12 AWG", cm: 6530 },
  { label: "10 AWG", cm: 10380 },
  { label: "8 AWG", cm: 16510 },
  { label: "6 AWG", cm: 26240 },
  { label: "4 AWG", cm: 41740 },
  { label: "3 AWG", cm: 52620 },
  { label: "2 AWG", cm: 66360 },
  { label: "1 AWG", cm: 83690 },
  { label: "1/0 AWG", cm: 105600 },
  { label: "2/0 AWG", cm: 133100 },
  { label: "3/0 AWG", cm: 167800 },
  { label: "4/0 AWG", cm: 211600 },
  { label: "250 kcmil", cm: 250000 },
  { label: "300 kcmil", cm: 300000 },
  { label: "350 kcmil", cm: 350000 },
  { label: "400 kcmil", cm: 400000 },
  { label: "500 kcmil", cm: 500000 },
];

/** Ohms per circular-mil-foot, NEC Chapter 9 Table 8 notes. */
const K: Record<Material, number> = { cu: 12.9, al: 21.2 };

const SAFETY = "#f5b83d";
const DIM = "#8a8fa0";

/** Schematic of the run: panel → wire (length + size) → load, with the drop visualized. */
function RunDiagram({
  volts,
  distance,
  sizeLabel,
  materialLabel,
  dropV,
  loadV,
}: {
  volts: number;
  distance: number;
  sizeLabel: string;
  materialLabel: string;
  dropV: number;
  loadV: number;
}) {
  const W = 440;
  const H = 216;
  const x0 = 24;
  const x1 = W - 24;
  const yWire = 64;
  // Voltage bar: full width = source volts; the lost slice is proportional (min 6px so it's visible).
  const lostFrac = Math.min(Math.max(dropV / volts, 0), 1);
  const lostW = Math.max(lostFrac * (x1 - x0), dropV > 0 ? 6 : 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" role="img" aria-label="Voltage drop run diagram">
      {/* panel */}
      <rect x={x0} y={yWire - 26} width={64} height={52} rx={8} fill="#1c1f2a" stroke={DIM} strokeWidth={1.5} />
      <text x={x0 + 32} y={yWire - 6} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        PANEL
      </text>
      <text x={x0 + 32} y={yWire + 12} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(volts, 0)}V
      </text>
      {/* load */}
      <rect x={x1 - 64} y={yWire - 26} width={64} height={52} rx={8} fill="#1c1f2a" stroke={DIM} strokeWidth={1.5} />
      <text x={x1 - 32} y={yWire - 6} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        LOAD
      </text>
      <text x={x1 - 32} y={yWire + 12} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(loadV, 1)}V
      </text>
      {/* wire run */}
      <line x1={x0 + 64} y1={yWire} x2={x1 - 64} y2={yWire} stroke={SAFETY} strokeWidth={5} strokeLinecap="round" />
      <text x={(x0 + x1) / 2} y={yWire - 14} fill={DIM} fontSize={12} fontWeight={700} textAnchor="middle">
        {fmt(distance, 0)} ft one-way
      </text>
      <text x={(x0 + x1) / 2} y={yWire + 26} fill={DIM} fontSize={12} fontWeight={700} textAnchor="middle">
        {sizeLabel} {materialLabel}
      </text>
      {/* voltage bar */}
      <rect x={x0} y={138} width={x1 - x0} height={26} rx={13} fill="#1c1f2a" />
      <rect x={x1 - lostW} y={138} width={lostW} height={26} rx={13} fill={SAFETY} opacity={0.9} />
      <text x={x0} y={182} fill={DIM} fontSize={12} fontWeight={700}>
        {fmt(volts, 0)}V at the panel
      </text>
      <text x={x1} y={182} fill={SAFETY} fontSize={12} fontWeight={800} textAnchor="end">
        {fmt(dropV, 1)}V lost ({fmt((dropV / volts) * 100, 1)}%)
      </text>
    </svg>
  );
}

export default function VoltageDrop() {
  const [voltage, setVoltage] = useState("240");
  const [phase, setPhase] = useState<Phase>("single");
  const [amps, setAmps] = useState("20");
  const [distance, setDistance] = useState("100");
  const [material, setMaterial] = useState<Material>("cu");
  const [target, setTarget] = useState("3");

  const calc = useMemo(() => {
    const V = parseFloat(voltage);
    const I = parseFloat(amps);
    const L = parseFloat(distance);
    const T = parseFloat(target);
    if (![V, I, L, T].every(isFinite) || V <= 0 || I <= 0 || L <= 0 || T <= 0) return null;
    const factor = phase === "three" ? Math.sqrt(3) : 2;
    const k = K[material];
    const rows = SIZES.map((s) => {
      const vd = (factor * k * I * L) / s.cm;
      return { ...s, vd, pct: (vd / V) * 100 };
    });
    let recIdx = rows.findIndex((r) => r.pct <= T);
    const maxedOut = recIdx === -1;
    if (maxedOut) recIdx = rows.length - 1;
    const rec = rows[recIdx];
    const smaller = recIdx > 0 ? rows[recIdx - 1] : null;
    return { V, I, L, T, rows, recIdx, rec, smaller, maxedOut, loadV: V - rec.vd };
  }, [voltage, phase, amps, distance, material, target]);

  const materialName = material === "cu" ? "copper" : "aluminum";

  const buildPayload = (): ToolQuotePayload | null => {
    if (!calc) return null;
    const { V, I, L, rec } = calc;
    return {
      source: "Voltage drop calculator",
      sourceHref: "/tools/electrical/voltage-drop-calculator",
      title: `Wire run — ${fmt(L, 0)} ft, ${fmt(I, 0)}A at ${fmt(V, 0)}V`,
      notes:
        `${phase === "three" ? "Three-phase" : "Single-phase"} ${fmt(V, 0)}V, ${fmt(I, 0)}A over ${fmt(L, 0)} ft one-way.\n` +
        `Use ${rec.label} ${materialName} — drop ${fmt(rec.vd, 1)}V (${fmt(rec.pct, 1)}%), ${fmt(calc.loadV, 1)}V at the load.\n` +
        `Verify ampacity per NEC 310 and local code before buying wire.`,
      lines: [
        {
          description: `${rec.label} ${materialName} wire — ${fmt(L, 0)} ft run (voltage drop calc)`,
          qty: 1,
          unit_price: 0,
          kind: "materials",
        },
      ],
    };
  };

  const resultText = calc
    ? `Voltage drop: ${fmt(calc.L, 0)} ft, ${fmt(calc.I, 0)}A at ${fmt(calc.V, 0)}V ${phase === "three" ? "three-phase" : "single-phase"} → use ${calc.rec.label} ${materialName}, drop ${fmt(calc.rec.vd, 1)}V (${fmt(calc.rec.pct, 1)}%).`
    : "";

  const tableRows = calc ? calc.rows.slice(Math.max(0, calc.recIdx - 1), calc.recIdx + 4) : [];

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="System voltage" hint="Line voltage at the panel.">
          <Seg
            ariaLabel="System voltage"
            value={voltage}
            onChange={setVoltage}
            options={[
              { value: "120", label: "120V" },
              { value: "208", label: "208V" },
              { value: "240", label: "240V" },
              { value: "277", label: "277V" },
              { value: "480", label: "480V" },
            ]}
          />
        </Field>
        <Field label="Phase" hint="Three-phase divides the drop by √3 for the same load.">
          <Seg<Phase>
            ariaLabel="Phase"
            value={phase}
            onChange={setPhase}
            options={[
              { value: "single", label: "Single-phase" },
              { value: "three", label: "Three-phase" },
            ]}
          />
        </Field>
        <Field label="Load current" hint="Actual running amps, not the breaker size.">
          <NumInput value={amps} onChange={setAmps} min={0.1} suffix="A" ariaLabel="Load current in amps" />
        </Field>
        <Field label="One-way distance" hint="Panel to load, in feet. The current travels out and back.">
          <NumInput value={distance} onChange={setDistance} min={1} suffix="ft" ariaLabel="One-way distance in feet" />
        </Field>
        <Field label="Conductor material" hint="Aluminum needs roughly two sizes larger for the same drop.">
          <Seg<Material>
            ariaLabel="Conductor material"
            value={material}
            onChange={setMaterial}
            options={[
              { value: "cu", label: "Copper" },
              { value: "al", label: "Aluminum" },
            ]}
          />
        </Field>
        <Field label="Max voltage drop" hint="NEC recommends 3% on branch circuits, 5% feeder + branch combined.">
          <Seg
            ariaLabel="Maximum voltage drop"
            value={target}
            onChange={setTarget}
            options={[
              { value: "3", label: "3%" },
              { value: "5", label: "5%" },
            ]}
          />
        </Field>
      </div>

      {calc ? (
        <>
          <RunDiagram
            volts={calc.V}
            distance={calc.L}
            sizeLabel={calc.rec.label}
            materialLabel={materialName}
            dropV={calc.rec.vd}
            loadV={calc.loadV}
          />

          {calc.maxedOut ? (
            <p className="mt-4 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">
              Even 500 kcmil {materialName} drops {fmt(calc.rec.pct, 1)}% on this run — over your {fmt(calc.T, 0)}%
              target. Consider a higher voltage, a shorter route, or parallel conductors, and have an engineer review
              it.
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Use this wire"
              value={calc.rec.label}
              sub={`${materialName} · smallest size under ${fmt(calc.T, 0)}% drop`}
              highlight
            />
            <Stat
              label="Voltage drop"
              value={`${fmt(calc.rec.vd, 1)}V`}
              sub={`${fmt(calc.rec.pct, 1)}% — ${fmt(calc.loadV, 1)}V at the load`}
            />
            <Stat
              label={calc.smaller ? `If you ran ${calc.smaller.label}` : "Next size up"}
              value={calc.smaller ? `${fmt(calc.smaller.pct, 1)}%` : "—"}
              sub={
                calc.smaller
                  ? calc.smaller.pct <= calc.T
                    ? "Also under target — your call on cost vs. headroom"
                    : "Over target — this is why you upsize"
                  : "Already at the smallest listed size"
              }
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-ink-600">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-ink-900 text-left text-[11px] uppercase tracking-[0.12em] text-bone-500">
                  <th className="px-4 py-3 font-bold">Wire size</th>
                  <th className="px-4 py-3 font-bold">Drop</th>
                  <th className="px-4 py-3 font-bold">% of {fmt(calc.V, 0)}V</th>
                  <th className="px-4 py-3 text-right font-bold">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => {
                  const isRec = r.label === calc.rec.label;
                  const ok = r.pct <= calc.T;
                  return (
                    <tr
                      key={r.label}
                      className={`border-t border-ink-700 ${isRec ? "bg-safety-500/10" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-paper">
                        {r.label}
                        {isRec ? <span className="ml-2 text-xs font-bold text-safety-300">← use this</span> : null}
                      </td>
                      <td className="px-4 py-2.5 text-bone-300">{fmt(r.vd, 1)}V</td>
                      <td className="px-4 py-2.5 text-bone-300">{fmt(r.pct, 1)}%</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${ok ? "text-emerald-400" : "text-ember-400"}`}>
                        {ok ? "✓" : "✗"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter the load and distance to size the wire.</p>
      )}
    </div>
  );
}
