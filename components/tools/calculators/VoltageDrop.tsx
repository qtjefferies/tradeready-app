"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { Field, Seg, SliderInput, Stat, StepSlider, fmt } from "../ui";
import { DIM, IsoBox, IsoStage, SAFETY, boxCorners, fitIso, type V3 } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Phase = "single" | "three";
type Material = "cu" | "al";

/**
 * Circular mils per NEC Chapter 9, Table 8, and allowable ampacity per NEC
 * Table 310.16, 75°C column (the terminal rating on most breakers and
 * lugs), copper and aluminum. `null` means the size isn't listed for that
 * material. The small-conductor limits of 240.4(D) (15/20/30 A for 14/12/10
 * copper; 15/25 A for 12/10 aluminum) are applied on top, since that is the
 * largest breaker you can put on the wire regardless of the table.
 */
const SIZES: { label: string; cm: number; ampCu: number; ampAl: number | null }[] = [
  { label: "14 AWG", cm: 4110, ampCu: 15, ampAl: null },
  { label: "12 AWG", cm: 6530, ampCu: 20, ampAl: 15 },
  { label: "10 AWG", cm: 10380, ampCu: 30, ampAl: 25 },
  { label: "8 AWG", cm: 16510, ampCu: 50, ampAl: 40 },
  { label: "6 AWG", cm: 26240, ampCu: 65, ampAl: 50 },
  { label: "4 AWG", cm: 41740, ampCu: 85, ampAl: 65 },
  { label: "3 AWG", cm: 52620, ampCu: 100, ampAl: 75 },
  { label: "2 AWG", cm: 66360, ampCu: 115, ampAl: 90 },
  { label: "1 AWG", cm: 83690, ampCu: 130, ampAl: 100 },
  { label: "1/0 AWG", cm: 105600, ampCu: 150, ampAl: 120 },
  { label: "2/0 AWG", cm: 133100, ampCu: 175, ampAl: 135 },
  { label: "3/0 AWG", cm: 167800, ampCu: 200, ampAl: 155 },
  { label: "4/0 AWG", cm: 211600, ampCu: 230, ampAl: 180 },
  { label: "250 kcmil", cm: 250000, ampCu: 255, ampAl: 205 },
  { label: "300 kcmil", cm: 300000, ampCu: 285, ampAl: 230 },
  { label: "350 kcmil", cm: 350000, ampCu: 310, ampAl: 250 },
  { label: "400 kcmil", cm: 400000, ampCu: 335, ampAl: 270 },
  { label: "500 kcmil", cm: 500000, ampCu: 380, ampAl: 310 },
];

/** Ohms per circular-mil-foot, NEC Chapter 9 Table 8 notes. */
const K: Record<Material, number> = { cu: 12.9, al: 21.2 };

/**
 * The run in 3D: panel, conductor, load. The run length is fitted to the
 * pane; the conductor's thickness is its real diameter relative to the panel
 * so switching sizes visibly changes the wire. The wire's colour fades from
 * full at the panel to dimmer at the load in proportion to the drop.
 */
function RunScene({
  volts,
  distance,
  cm,
  sizeLabel,
  materialLabel,
  dropV,
  loadV,
  pct,
  target,
}: {
  volts: number;
  distance: number;
  cm: number;
  sizeLabel: string;
  materialLabel: string;
  dropV: number;
  loadV: number;
  pct: number;
  target: number;
}) {
  const W = 480;
  const H = 240;
  // World units: feet. The panel is ~1.2 ft wide × 2.5 ft tall; the run is
  // drawn at a fixed 14 ft on screen so the boxes stay readable, and the
  // real distance goes on the label.
  const run = 14;
  const box = { w: 1.2, d: 0.5, h: 2.6 };
  const dia = Math.sqrt(cm) / 1000; // inches
  const wireT = Math.max(dia / 12, 0.09); // ft, clamped so 14 AWG is still visible
  const wireZ = 1.2;
  const corners = [...boxCorners(0, 0, 0, box.w, box.d, box.h), ...boxCorners(box.w + run, 0, 0, box.w, box.d, box.h), [box.w, -1, -0.6] as V3];
  const pr = fitIso(corners, W, H, 26);
  const { P, pts } = pr;
  const x0 = box.w;
  const x1 = box.w + run;
  const y = box.d / 2 - wireT / 2;
  const over = pct > target;
  const endColor = over ? "#ea580c" : "#b07a1f";
  const panelT = P(box.w / 2, box.d, box.h);
  const loadT = P(x1 + box.w / 2, box.d, box.h);
  const mid = P((x0 + x1) / 2, box.d, wireZ + wireT);
  const midBelow = P((x0 + x1) / 2, box.d, 0);
  const gid = "wireGrad";

  return (
    <IsoStage W={W} H={H} label={`${fmt(distance, 0)} foot run of ${sizeLabel} ${materialLabel}, ${fmt(dropV, 1)} volts lost`}>
      <defs>
        <linearGradient id={gid} x1={P(x0, y, wireZ).x} x2={P(x1, y, wireZ).x} y1={0} y2={0} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={SAFETY} />
          <stop offset="1" stopColor={endColor} />
        </linearGradient>
      </defs>
      {/* floor line */}
      <polygon points={pts([-0.6, -0.6, 0], [x1 + box.w + 0.6, -0.6, 0], [x1 + box.w + 0.6, box.d + 0.6, 0], [-0.6, box.d + 0.6, 0])} fill="#0f1116" />
      {/* conductor, drawn as a long thin box */}
      <IsoBox pr={pr} x={x0} y={y} z={wireZ} dx={run} dy={wireT} dz={wireT} top={`url(#${gid})`} right={endColor} left={endColor} stroke="none" />
      {/* panel */}
      <IsoBox pr={pr} x={0} y={0} z={0} dx={box.w} dy={box.d} dz={box.h} top="#3a3f4c" topStroke={SAFETY} />
      {/* load */}
      <IsoBox pr={pr} x={x1} y={0} z={0} dx={box.w} dy={box.d} dz={box.h} top="#3a3f4c" topStroke={over ? "#ea580c" : SAFETY} />
      {/* labels */}
      <text x={panelT.x} y={panelT.y - 22} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        PANEL
      </text>
      <text x={panelT.x} y={panelT.y - 8} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(volts, 0)}V
      </text>
      <text x={loadT.x} y={loadT.y - 22} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        LOAD
      </text>
      <text x={loadT.x} y={loadT.y - 8} fill={over ? "#fb923c" : SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(loadV, 1)}V
      </text>
      <text x={mid.x} y={mid.y - 14} fill={DIM} fontSize={12} fontWeight={700} textAnchor="middle">
        {fmt(distance, 0)} ft one-way
      </text>
      <text x={midBelow.x} y={midBelow.y + 22} fill={over ? "#fb923c" : SAFETY} fontSize={12} fontWeight={800} textAnchor="middle">
        {fmt(dropV, 1)}V lost ({fmt(pct, 1)}%)
      </text>
      <text x={12} y={H - 10} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        {sizeLabel} {materialLabel} · {fmt(dia, 3)}&quot; dia
      </text>
    </IsoStage>
  );
}

export default function VoltageDrop() {
  const [q, set] = useUrlState({ v: "240", ph: "single", a: "20", d: "100", m: "cu", t: "3" });
  const voltage = q.v;
  const phase = (q.ph === "three" ? "three" : "single") as Phase;
  const amps = q.a;
  const distance = q.d;
  const material = (q.m === "al" ? "al" : "cu") as Material;
  const target = q.t;
  const setVoltage = set("v");
  const setPhase = set("ph") as (v: Phase) => void;
  const setAmps = set("a");
  const setDistance = set("d");
  const setMaterial = set("m") as (v: Material) => void;
  const setTarget = set("t");

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
      const amp = material === "cu" ? s.ampCu : s.ampAl;
      return { ...s, vd, pct: (vd / V) * 100, amp, ampOk: amp !== null && amp >= I };
    });
    // Two constraints, and the wire must satisfy both: it has to carry the
    // load (ampacity) and it has to keep the drop under target.
    const dropIdx = rows.findIndex((r) => r.pct <= T);
    const ampIdx = rows.findIndex((r) => r.ampOk);
    const maxedOut = dropIdx === -1;
    const ampMaxed = ampIdx === -1;
    const recIdx = Math.max(maxedOut ? rows.length - 1 : dropIdx, ampMaxed ? rows.length - 1 : ampIdx);
    const rec = rows[recIdx];
    const governed: "ampacity" | "drop" | "both" =
      !maxedOut && !ampMaxed && ampIdx === dropIdx ? "both" : ampIdx > dropIdx ? "ampacity" : "drop";
    const smaller = recIdx > 0 ? rows[recIdx - 1] : null;
    return { V, I, L, T, rows, recIdx, rec, smaller, maxedOut, ampMaxed, governed, dropIdx, ampIdx, loadV: V - rec.vd };
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
        `Use ${rec.label} ${materialName} — drop ${fmt(rec.vd, 1)}V (${fmt(rec.pct, 1)}%), ${fmt(calc.loadV, 1)}V at the load; ` +
        `rated ${rec.amp ?? "—"}A at 75°C (NEC 310.16). Sized by ${calc.governed === "ampacity" ? "ampacity" : calc.governed === "drop" ? "voltage drop" : "ampacity and voltage drop"}.\n` +
        `Apply derating for ambient temperature and conduit fill per NEC 310.15, and confirm with local code.`,
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
    ? `Wire size: ${fmt(calc.L, 0)} ft, ${fmt(calc.I, 0)}A at ${fmt(calc.V, 0)}V ${phase === "three" ? "three-phase" : "single-phase"} → use ${calc.rec.label} ${materialName} (${calc.rec.amp ?? "—"}A at 75°C), drop ${fmt(calc.rec.vd, 1)}V (${fmt(calc.rec.pct, 1)}%).`
    : "";

  const tableRows = calc
    ? calc.rows.slice(Math.max(0, Math.min(calc.recIdx, calc.dropIdx === -1 ? calc.recIdx : calc.dropIdx, calc.ampIdx === -1 ? calc.recIdx : calc.ampIdx) - 1), calc.recIdx + 3)
    : [];

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="System voltage" hint="Line voltage at the panel.">
          <StepSlider
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
          <SliderInput value={amps} onChange={setAmps} min={1} max={400} step={1} suffix="A" ariaLabel="Load current in amps" />
        </Field>
        <Field label="One-way distance" hint="Panel to load, in feet. The current travels out and back.">
          <SliderInput value={distance} onChange={setDistance} min={5} max={1000} step={5} suffix="ft" ariaLabel="One-way distance in feet" />
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
          <SliderInput value={target} onChange={setTarget} min={1} max={10} step={0.5} suffix="%" ariaLabel="Maximum voltage drop" />
        </Field>
      </div>

      {calc ? (
        <>
          <RunScene
            volts={calc.V}
            distance={calc.L}
            cm={calc.rec.cm}
            sizeLabel={calc.rec.label}
            materialLabel={materialName}
            dropV={calc.rec.vd}
            loadV={calc.loadV}
            pct={calc.rec.pct}
            target={calc.T}
          />

          {calc.maxedOut ? (
            <p className="mt-4 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">
              Even 500 kcmil {materialName} drops {fmt(calc.rec.pct, 1)}% on this run — over your {fmt(calc.T, 1)}%
              target. Consider a higher voltage, a shorter route, or parallel conductors, and have an engineer review
              it.
            </p>
          ) : null}
          {calc.ampMaxed ? (
            <p className="mt-4 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">
              No single {materialName} conductor up to 500 kcmil is rated for {fmt(calc.I, 0)}A at 75°C. This is a
              parallel-conductor job — NEC 310.10(G) — and needs an engineered design.
            </p>
          ) : null}
          {calc.governed === "ampacity" && !calc.ampMaxed ? (
            <p className="mt-4 rounded-xl border border-safety-500/40 bg-safety-500/10 p-4 text-sm leading-relaxed text-bone-200">
              <span className="font-bold text-safety-300">Ampacity governs here, not voltage drop.</span>{" "}
              {calc.rows[calc.dropIdx === -1 ? calc.recIdx : calc.dropIdx].label} would hold the drop under{" "}
              {fmt(calc.T, 1)}%, but it is only rated{" "}
              {calc.rows[calc.dropIdx === -1 ? calc.recIdx : calc.dropIdx].amp ?? "—"}A at 75°C — too small to
              legally carry {fmt(calc.I, 0)}A. {calc.rec.label} is the smallest {materialName} that does both.
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Use this wire"
              value={calc.rec.label}
              sub={`${materialName} · ${calc.rec.amp ?? "—"}A at 75°C · sized by ${
                calc.governed === "ampacity" ? "ampacity" : calc.governed === "drop" ? "voltage drop" : "both limits"
              }`}
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
                  ? !calc.smaller.ampOk
                    ? `Only ${calc.smaller.amp ?? "not"} rated${calc.smaller.amp ? "A" : ""} at 75°C — can't carry the load`
                    : calc.smaller.pct <= calc.T
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
                  <th className="px-4 py-3 font-bold">75°C rating</th>
                  <th className="px-4 py-3 font-bold">Drop</th>
                  <th className="px-4 py-3 font-bold">% of {fmt(calc.V, 0)}V</th>
                  <th className="px-4 py-3 text-right font-bold">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => {
                  const isRec = r.label === calc.rec.label;
                  const dropOk = r.pct <= calc.T;
                  const ok = dropOk && r.ampOk;
                  return (
                    <tr
                      key={r.label}
                      className={`border-t border-ink-700 ${isRec ? "bg-safety-500/10" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-bold text-paper">
                        {r.label}
                        {isRec ? <span className="ml-2 text-xs font-bold text-safety-300">← use this</span> : null}
                      </td>
                      <td className={`px-4 py-2.5 ${r.ampOk ? "text-bone-300" : "text-ember-400"}`}>
                        {r.amp === null ? "—" : `${r.amp}A`}
                      </td>
                      <td className="px-4 py-2.5 text-bone-300">{fmt(r.vd, 1)}V</td>
                      <td className={`px-4 py-2.5 ${dropOk ? "text-bone-300" : "text-ember-400"}`}>{fmt(r.pct, 1)}%</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${ok ? "text-emerald-400" : "text-ember-400"}`}>
                        {ok ? "✓" : !r.ampOk ? "✗ amps" : "✗ drop"}
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
