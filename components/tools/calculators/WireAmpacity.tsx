"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { Field, Seg, SliderInput, Stat, StepSlider, fmt } from "../ui";
import { DIM, IsoCylinder, IsoStage, SAFETY, boxCorners, fitIso, type V3 } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Mode = "carry" | "load";
type Material = "cu" | "al";
type Temp = "60" | "75" | "90";
type Term = "60" | "75";
type YesNo = "yes" | "no";

/** Conductor sizes, NEC Chapter 9 Table 8 (circular mils drive the drawing). */
const SIZES: { value: string; label: string; cm: number }[] = [
  { value: "14", label: "14 AWG", cm: 4110 },
  { value: "12", label: "12 AWG", cm: 6530 },
  { value: "10", label: "10 AWG", cm: 10380 },
  { value: "8", label: "8 AWG", cm: 16510 },
  { value: "6", label: "6 AWG", cm: 26240 },
  { value: "4", label: "4 AWG", cm: 41740 },
  { value: "3", label: "3 AWG", cm: 52620 },
  { value: "2", label: "2 AWG", cm: 66360 },
  { value: "1", label: "1 AWG", cm: 83690 },
  { value: "1/0", label: "1/0 AWG", cm: 105600 },
  { value: "2/0", label: "2/0 AWG", cm: 133100 },
  { value: "3/0", label: "3/0 AWG", cm: 167800 },
  { value: "4/0", label: "4/0 AWG", cm: 211600 },
  { value: "250", label: "250 kcmil", cm: 250000 },
  { value: "300", label: "300 kcmil", cm: 300000 },
  { value: "350", label: "350 kcmil", cm: 350000 },
  { value: "400", label: "400 kcmil", cm: 400000 },
  { value: "500", label: "500 kcmil", cm: 500000 },
];

/**
 * NEC Table 310.16 allowable ampacities, indexed in the same order as SIZES.
 * `null` means the size isn't listed for that material (14 AWG aluminum).
 */
const AMP: Record<Material, Record<Temp, (number | null)[]>> = {
  cu: {
    "60": [15, 20, 30, 40, 55, 70, 85, 95, 110, 125, 145, 165, 195, 215, 240, 260, 280, 320],
    "75": [20, 25, 35, 50, 65, 85, 100, 115, 130, 150, 175, 200, 230, 255, 285, 310, 335, 380],
    "90": [25, 30, 40, 55, 75, 95, 110, 130, 145, 170, 195, 225, 260, 290, 320, 350, 380, 430],
  },
  al: {
    "60": [null, 15, 25, 35, 40, 55, 65, 75, 85, 100, 115, 130, 150, 170, 195, 210, 225, 260],
    "75": [null, 20, 30, 40, 50, 65, 75, 90, 100, 120, 135, 155, 180, 205, 230, 250, 270, 310],
    "90": [null, 25, 35, 45, 55, 75, 85, 100, 115, 135, 150, 175, 205, 230, 260, 280, 305, 350],
  },
};

/** NEC 240.4(D) small-conductor overcurrent limits, by size value. */
const SMALL_CAP: Record<Material, Record<string, number>> = {
  cu: { "14": 15, "12": 20, "10": 30 },
  al: { "12": 15, "10": 25 },
};

/** NEC 240.6(A) standard breaker sizes carried by this tool. */
const STD_BREAKERS = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400];

/**
 * NEC Table 310.15(B)(1) ambient correction factors, as [upper °C, factor]
 * bands. Below 21°C the table allows an uplift; this tool holds 1.00 there
 * on purpose. Past the last band the insulation isn't rated for the ambient.
 */
const TEMP_BANDS: Record<Temp, [number, number][]> = {
  "60": [
    [20, 1.0],
    [25, 1.08],
    [30, 1.0],
    [35, 0.91],
    [40, 0.82],
    [45, 0.71],
    [50, 0.58],
    [55, 0.41],
  ],
  "75": [
    [20, 1.0],
    [25, 1.05],
    [30, 1.0],
    [35, 0.94],
    [40, 0.88],
    [45, 0.82],
    [50, 0.75],
    [55, 0.67],
    [60, 0.58],
    [70, 0.33],
  ],
  "90": [
    [20, 1.0],
    [25, 1.04],
    [30, 1.0],
    [35, 0.96],
    [40, 0.91],
    [45, 0.87],
    [50, 0.82],
    [55, 0.76],
    [60, 0.71],
    [70, 0.58],
    [80, 0.41],
  ],
};

function tempFactor(celsius: number, col: Temp): number | null {
  for (const [upper, f] of TEMP_BANDS[col]) if (celsius <= upper) return f;
  return null;
}

/** NEC Table 310.15(C)(1) adjustment for more than three current-carrying conductors. */
function bundleFactor(n: number): number {
  if (n <= 3) return 1.0;
  if (n <= 6) return 0.8;
  if (n <= 9) return 0.7;
  if (n <= 20) return 0.5;
  return 0.45;
}

/**
 * Largest breaker the conductor may be protected by. Under 800 A, 240.4(B)
 * lets you round up to the next standard size when the ampacity doesn't
 * land on one; at or above 800 A you must round down. The 240.4(D) small-
 * conductor cap wins over both.
 */
function maxBreaker(ampacity: number, cap: number | undefined): number | null {
  if (!(ampacity > 0)) return null;
  let b: number;
  if (ampacity >= 800) {
    const under = STD_BREAKERS.filter((s) => s <= ampacity);
    b = under.length ? under[under.length - 1] : STD_BREAKERS[0];
  } else {
    const exact = STD_BREAKERS.find((s) => Math.abs(s - ampacity) < 0.05);
    const up = STD_BREAKERS.find((s) => s > ampacity);
    b = exact ?? up ?? STD_BREAKERS[STD_BREAKERS.length - 1];
  }
  return cap !== undefined ? Math.min(b, cap) : b;
}

/** Smallest standard breaker that is at least `amps`. */
function breakerAtLeast(amps: number): number | null {
  return STD_BREAKERS.find((s) => s >= amps) ?? null;
}

/** Hex-lattice conductor positions, closest to the centre first. */
function hexSpots(n: number, r: number): [number, number][] {
  const out: [number, number][] = [];
  for (let j = -6; j <= 6; j++) {
    for (let i = -6; i <= 6; i++) {
      const x = (i + (j % 2 !== 0 ? 0.5 : 0)) * 2 * r;
      const y = j * Math.sqrt(3) * r;
      out.push([x, y]);
    }
  }
  out.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
  return out.slice(0, n);
}

/**
 * Cutaway of the raceway: a translucent conduit standing on end with the
 * conductors bundled inside, cut flush at the top so the copper or aluminum
 * shows. The orange glow on the cut face scales with how much derating is
 * applied; the badge in the corner shows the ambient as sun or ice.
 */
function RacewayScene({
  n,
  ambientF,
  ambientC,
  tf,
  bf,
  material,
  sizeLabel,
  rating,
}: {
  n: number;
  ambientF: number;
  ambientC: number;
  tf: number | null;
  bf: number;
  material: Material;
  sizeLabel: string;
  rating: string;
}) {
  const W = 480;
  const H = 260;
  const r = 1;
  const h = 2.4;
  const spots = hexSpots(n, r);
  const reach = Math.max(...spots.map(([x, y]) => Math.hypot(x, y))) + r;
  const R = Math.max(reach * 1.12 + 0.2, 2.1);
  const corners: V3[] = [...boxCorners(-R * 1.15, -R * 1.15, 0, R * 2.3, R * 2.3, h)];
  const pr = fitIso(corners, W, H, 34);
  const { P, ellipse } = pr;
  const ordered = [...spots].sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  const glow = tf === null ? 1 : Math.min(Math.max(1 - tf * bf, 0), 1);
  const metalTop = material === "cu" ? "#d4884a" : "#d9dde4";
  const metalStroke = material === "cu" ? "#7a4318" : "#6b7280";
  const top = P(0, 0, h);
  const bottom = P(0, 0, 0);
  const topE = ellipse(R);
  const glowE = ellipse(R * 0.96);
  const shadowE = ellipse(R * 1.12);
  const hot = ambientF >= 95;
  const cold = ambientF <= 60;
  const badgeColor = hot ? "#fb923c" : cold ? "#7dd3fc" : DIM;
  const bx = W - 22;
  const by = 22;

  return (
    <IsoStage
      W={W}
      H={H}
      label={`Cutaway of a raceway with ${n} current-carrying ${sizeLabel} conductors at ${fmt(ambientF, 0)}°F ambient`}
    >
      <defs>
        <radialGradient id="heatGlow">
          <stop offset="0" stopColor="#f97316" stopOpacity={0.95} />
          <stop offset="1" stopColor="#f97316" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* floor shadow */}
      <ellipse cx={bottom.x} cy={bottom.y} rx={shadowE.rx} ry={shadowE.ry} fill="#0f1116" />
      {/* conductors, back to front, cut flush with the raceway */}
      {ordered.map(([x, y], i) => (
        <IsoCylinder
          key={i}
          pr={pr}
          cx={x}
          cy={y}
          z={0}
          r={r * 0.9}
          h={h}
          body="#23262e"
          top={metalTop}
          stroke={metalStroke}
        />
      ))}
      {/* raceway wall, translucent so the bundle reads through it */}
      <IsoCylinder pr={pr} cx={0} cy={0} z={0} r={R} h={h} body="rgba(138,143,160,0.16)" top="none" stroke={DIM} />
      <ellipse cx={top.x} cy={top.y} rx={topE.rx} ry={topE.ry} fill="none" stroke={DIM} strokeWidth={1.5} />
      {/* heat: stronger the more derating applies */}
      <ellipse cx={top.x} cy={top.y} rx={glowE.rx} ry={glowE.ry} fill="url(#heatGlow)" opacity={glow * 0.85} style={{ mixBlendMode: "screen" }} />
      {/* ambient badge */}
      <g transform={`translate(${bx} ${by})`} aria-hidden="true">
        {hot
          ? [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line key={deg} x1={0} y1={-9} x2={0} y2={-13} stroke={badgeColor} strokeWidth={2} strokeLinecap="round" transform={`rotate(${deg})`} />
            ))
          : null}
        {cold
          ? [0, 60, 120].map((deg) => (
              <line key={deg} x1={0} y1={-12} x2={0} y2={12} stroke={badgeColor} strokeWidth={2} strokeLinecap="round" transform={`rotate(${deg})`} />
            ))
          : null}
        <circle r={cold ? 4 : 7} fill={badgeColor} />
      </g>
      <text x={bx - 18} y={by + 4} fill={badgeColor} fontSize={12} fontWeight={800} textAnchor="end">
        {fmt(ambientF, 0)}°F · {fmt(ambientC, 0)}°C ambient
      </text>
      <text x={12} y={22} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        Temp factor ×{tf === null ? "—" : tf.toFixed(2)}
      </text>
      <text x={12} y={38} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        {n} current-carrying ×{bf.toFixed(2)}
      </text>
      <text x={12} y={H - 10} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        {sizeLabel} {material === "cu" ? "copper" : "aluminum"} · cut section
      </text>
      <text x={W - 12} y={H - 10} fill={tf === null ? "#fb923c" : SAFETY} fontSize={13} fontWeight={800} textAnchor="end">
        {rating}
      </text>
    </IsoStage>
  );
}

type Row = {
  idx: number;
  value: string;
  label: string;
  cm: number;
  base: number | null;
  termCap: number | null;
  derated: number;
  final: number;
  cappedByTerm: boolean;
  smallCap: number | undefined;
  breaker: number | null;
  ok: boolean;
};

export default function WireAmpacity() {
  const [q, set] = useUrlState({
    mode: "carry",
    s: "12",
    m: "cu",
    ins: "75",
    term: "75",
    amb: "86",
    n: "3",
    cont: "no",
    a: "20",
  });
  const mode = (q.mode === "load" ? "load" : "carry") as Mode;
  const size = SIZES.some((s) => s.value === q.s) ? q.s : "12";
  const material = (q.m === "al" ? "al" : "cu") as Material;
  const ins = (q.ins === "60" || q.ins === "90" ? q.ins : "75") as Temp;
  const term = (q.term === "60" ? "60" : "75") as Term;
  const ambient = q.amb;
  const count = q.n;
  const continuous = (q.cont === "yes" ? "yes" : "no") as YesNo;
  const amps = q.a;
  const setMode = set("mode") as (v: Mode) => void;
  const setSize = set("s");
  const setMaterial = set("m") as (v: Material) => void;
  const setIns = set("ins") as (v: Temp) => void;
  const setTerm = set("term") as (v: Term) => void;
  const setAmbient = set("amb");
  const setCount = set("n");
  const setContinuous = set("cont") as (v: YesNo) => void;
  const setAmps = set("a");

  const calc = useMemo(() => {
    const F = parseFloat(ambient);
    const nRaw = parseFloat(count);
    const I = parseFloat(amps);
    if (!isFinite(F) || !isFinite(nRaw) || nRaw < 1) return null;
    if (mode === "load" && (!isFinite(I) || I <= 0)) return null;
    const n = Math.min(Math.round(nRaw), 30);
    const C = ((F - 32) * 5) / 9;
    const tf = tempFactor(C, ins);
    const bf = bundleFactor(n);
    const isCont = continuous === "yes";
    const needed = mode === "load" ? I * (isCont ? 1.25 : 1) : 0;
    const neededBreaker = mode === "load" ? breakerAtLeast(needed) : null;

    const rows: Row[] = SIZES.map((s, idx) => {
      const base = AMP[material][ins][idx];
      const termCap = AMP[material][term][idx];
      const smallCap = SMALL_CAP[material][s.value];
      if (base === null || termCap === null || tf === null) {
        return { idx, ...s, base, termCap, derated: 0, final: 0, cappedByTerm: false, smallCap, breaker: null, ok: false };
      }
      const derated = base * tf * bf;
      const final = Math.min(derated, termCap);
      const breaker = maxBreaker(final, smallCap);
      const ok =
        mode === "load" ? final >= needed && breaker !== null && neededBreaker !== null && breaker >= neededBreaker : final > 0;
      return { idx, ...s, base, termCap, derated, final, cappedByTerm: derated > termCap, smallCap, breaker, ok };
    });

    const selIdx = mode === "carry" ? SIZES.findIndex((s) => s.value === size) : rows.findIndex((r) => r.ok);
    const maxed = selIdx === -1;
    const sel = rows[maxed ? rows.length - 1 : selIdx];
    const from = Math.max(0, sel.idx - 2);
    const tableRows = rows.slice(from, Math.min(rows.length, from + 5));
    return { F, C, n, tf, bf, isCont, I, needed, neededBreaker, rows, sel, maxed, tableRows, usable: sel.final * (isCont ? 0.8 : 1) };
  }, [mode, size, material, ins, term, ambient, count, continuous, amps]);

  const materialName = material === "cu" ? "copper" : "aluminum";
  const notPermitted = calc !== null && calc.tf === null;
  const notListed = calc !== null && calc.sel.base === null;

  const buildPayload = (): ToolQuotePayload | null => {
    if (!calc || notPermitted || notListed || (mode === "load" && calc.maxed)) return null;
    const { sel } = calc;
    const summary =
      mode === "carry"
        ? `${sel.label} ${materialName}, ${ins}°C insulation on ${term}°C terminals: ${sel.base}A table, ${fmt(sel.final, 1)}A after derating${sel.cappedByTerm ? " (terminal-limited)" : ""}, max ${sel.breaker ?? "—"}A breaker.`
        : `${fmt(calc.I, 0)}A ${calc.isCont ? "continuous " : ""}load → ${sel.label} ${materialName} (${fmt(sel.final, 1)}A after derating, needs ${fmt(calc.needed, 1)}A), ${calc.neededBreaker ?? "—"}A breaker.`;
    return {
      source: "Wire ampacity calculator",
      sourceHref: "/tools/electrical/wire-ampacity-calculator",
      title: mode === "carry" ? `${sel.label} ${materialName} — ${fmt(sel.final, 0)}A after derating` : `${fmt(calc.I, 0)}A circuit — ${sel.label} ${materialName}`,
      notes:
        `${summary}\n` +
        `Derating: ${fmt(calc.F, 0)}°F ambient (×${calc.tf?.toFixed(2)}, NEC 310.15(B)(1)), ${calc.n} current-carrying conductors (×${calc.bf.toFixed(2)}, 310.15(C)(1)); ` +
        `terminal rating ${term}°C per 110.14(C); breaker per 240.4(B)/(D). Confirm with local code and the equipment listing.`,
      lines: [
        {
          description: `${sel.label} ${materialName} conductor, ${ins}°C insulation — ${calc.n} conductors in raceway (ampacity calc)`,
          qty: calc.n,
          unit_price: 0,
          kind: "materials",
        },
      ],
    };
  };

  const resultText =
    calc && !notPermitted && !notListed
      ? mode === "carry"
        ? `Ampacity: ${calc.sel.label} ${materialName} at ${ins}°C, ${term}°C terminals, ${fmt(calc.F, 0)}°F, ${calc.n} conductors → ${fmt(calc.sel.final, 1)}A after derating (table ${calc.sel.base}A), max breaker ${calc.sel.breaker ?? "—"}A${calc.isCont ? `, ${fmt(calc.usable, 1)}A continuous` : ""}.`
        : calc.maxed
          ? `Wire size: no single ${materialName} conductor up to 500 kcmil carries ${fmt(calc.needed, 1)}A under these conditions.`
          : `Wire size: ${fmt(calc.I, 0)}A ${calc.isCont ? "continuous " : ""}load at ${fmt(calc.F, 0)}°F with ${calc.n} conductors → ${calc.sel.label} ${materialName} (${ins}°C wire, ${term}°C terminals), ${fmt(calc.sel.final, 1)}A after derating, ${calc.neededBreaker ?? "—"}A breaker.`
      : "";

  const insOptions = [
    { value: "60" as Temp, label: "60°C (TW, UF)" },
    { value: "75" as Temp, label: "75°C (THW, USE)" },
    { value: "90" as Temp, label: "90°C (THHN, XHHW-2)" },
  ];

  return (
    <div>
      <Field label="What do you need?">
        <Seg<Mode>
          ariaLabel="Calculator mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "carry", label: "What can this wire carry?" },
            { value: "load", label: "What wire for this load?" },
          ]}
        />
      </Field>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {mode === "carry" ? (
          <Field label={`Wire size — ${SIZES.find((s) => s.value === size)?.label ?? ""}`} hint="AWG through 500 kcmil, NEC Table 310.16.">
            <div className="[&_[role=group]]:flex-wrap [&_[role=group]]:gap-x-1">
              <StepSlider ariaLabel="Wire size" value={size} onChange={setSize} options={SIZES.map((s) => ({ value: s.value, label: s.value }))} />
            </div>
          </Field>
        ) : (
          <Field label="Load current" hint="Actual load in amps. Continuous loads get the 125% bump below.">
            <SliderInput value={amps} onChange={setAmps} min={1} max={400} step={1} suffix="A" ariaLabel="Load current in amps" />
          </Field>
        )}
        <Field label="Continuous load?" hint="Runs 3 hours or more at max current — water heaters, lighting, EV chargers. NEC 210.19(A) and 215.2(A).">
          <Seg<YesNo>
            ariaLabel="Continuous load"
            value={continuous}
            onChange={setContinuous}
            options={[
              { value: "no", label: "No" },
              { value: "yes", label: "Yes, continuous" },
            ]}
          />
        </Field>
        <Field label="Conductor material" hint="14 AWG aluminum isn't listed in Table 310.16.">
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
        <Field label="Insulation rating" hint="The column derating starts from. THHN is 90°C, but see the terminal rating.">
          <StepSlider<Temp> ariaLabel="Insulation temperature rating" value={ins} onChange={setIns} options={insOptions} />
        </Field>
        <Field label="Terminal rating" hint="NEC 110.14(C): equipment 100 A and under is 60°C unless marked 75°C. The final ampacity can't exceed this column.">
          <Seg<Term>
            ariaLabel="Terminal temperature rating"
            value={term}
            onChange={setTerm}
            options={[
              { value: "60", label: "60°C terminals" },
              { value: "75", label: "75°C terminals" },
            ]}
          />
        </Field>
        <Field label="Ambient temperature" hint="Where the raceway lives. 86°F (30°C) is the table baseline; attics and rooftops run far hotter.">
          <SliderInput value={ambient} onChange={setAmbient} min={50} max={140} step={1} suffix="°F" ariaLabel="Ambient temperature in Fahrenheit" />
        </Field>
        <Field label="Current-carrying conductors" hint="In the same raceway or cable. Grounds don't count; neutrals usually do on 2-wire and nonlinear circuits (310.15(E)).">
          <SliderInput value={count} onChange={setCount} min={1} max={30} step={1} ariaLabel="Number of current-carrying conductors" />
        </Field>
      </div>

      {calc ? (
        <>
          <RacewayScene
            n={calc.n}
            ambientF={calc.F}
            ambientC={calc.C}
            tf={calc.tf}
            bf={calc.bf}
            material={material}
            sizeLabel={calc.sel.label}
            rating={
              notPermitted
                ? "Too hot for this insulation"
                : notListed
                  ? "Not listed"
                  : mode === "load" && calc.maxed
                    ? "Over 500 kcmil"
                    : `${fmt(calc.sel.final, 0)}A after derating`
            }
          />

          {notPermitted ? (
            <p className="mt-4 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">
              Table 310.15(B)(1) has no correction factor for {ins}°C insulation at {fmt(calc.C, 0)}°C ambient — the
              wire isn&apos;t rated for that environment. Use a higher insulation rating, re-route the raceway, or bring
              the ambient down.
            </p>
          ) : null}
          {notListed && !notPermitted ? (
            <p className="mt-4 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">
              Table 310.16 doesn&apos;t list 14 AWG aluminum. Pick 12 AWG or switch to copper.
            </p>
          ) : null}
          {mode === "load" && calc.maxed && !notPermitted ? (
            <p className="mt-4 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">
              No single {materialName} conductor up to 500 kcmil carries {fmt(calc.needed, 1)}A under these conditions.
              That&apos;s a parallel-conductor job (NEC 310.10(G)) — or split the raceway to get the bundling factor
              back — and it needs an engineered design.
            </p>
          ) : null}
          {!notPermitted && !notListed && calc.sel.cappedByTerm ? (
            <p className="mt-4 rounded-xl border border-safety-500/40 bg-safety-500/10 p-4 text-sm leading-relaxed text-bone-200">
              <span className="font-bold text-safety-300">The terminals set the limit, not the wire.</span> {calc.sel.label}{" "}
              {materialName} at {ins}°C derates to {fmt(calc.sel.derated, 1)}A, but the {term}°C lugs cap it at{" "}
              {calc.sel.termCap}A (NEC 110.14(C)). The 90°C column is for derating headroom — you never get to size the
              breaker from it.
            </p>
          ) : null}
          {!notPermitted && !notListed && calc.sel.smallCap !== undefined && calc.sel.breaker === calc.sel.smallCap && calc.sel.final > calc.sel.smallCap ? (
            <p className="mt-4 rounded-xl border border-safety-500/40 bg-safety-500/10 p-4 text-sm leading-relaxed text-bone-200">
              <span className="font-bold text-safety-300">Small-conductor cap.</span> NEC 240.4(D) limits {calc.sel.label}{" "}
              {materialName} to a {calc.sel.smallCap}A breaker no matter what the table says.
            </p>
          ) : null}

          {mode === "carry" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Ampacity after derating"
                value={notPermitted || notListed ? "—" : `${fmt(calc.sel.final, 1)}A`}
                sub={
                  notPermitted || notListed
                    ? "See the note above"
                    : `${calc.sel.base}A × ${calc.tf?.toFixed(2)} temp × ${calc.bf.toFixed(2)} fill${calc.sel.cappedByTerm ? ` → capped at ${calc.sel.termCap}A by ${term}°C terminals` : ""}`
                }
                highlight
              />
              <Stat label={`Table 310.16 at ${ins}°C`} value={calc.sel.base === null ? "—" : `${calc.sel.base}A`} sub={`${calc.sel.label} ${materialName}, before any derating`} />
              <Stat
                label="Max breaker"
                value={calc.sel.breaker === null ? "—" : `${calc.sel.breaker}A`}
                sub={
                  calc.sel.breaker === null
                    ? "Not usable here"
                    : calc.sel.smallCap !== undefined && calc.sel.breaker === calc.sel.smallCap
                      ? `240.4(D) cap for ${calc.sel.label} ${materialName}`
                      : calc.sel.breaker > calc.sel.final
                        ? "Next size up allowed, NEC 240.4(B)"
                        : "Standard size, NEC 240.6(A)"
                }
              />
              <Stat
                label={calc.isCont ? "Continuous load max" : "Max load if continuous"}
                value={notPermitted || notListed ? "—" : `${fmt(calc.usable, 1)}A`}
                sub={calc.isCont ? "Derated ampacity × 0.8 — NEC 210.19(A), 215.2(A)" : `${fmt(calc.sel.final * 0.8, 1)}A if it ever runs 3 hours or more`}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Use this wire"
                value={calc.maxed || notPermitted ? "—" : calc.sel.label}
                sub={calc.maxed || notPermitted ? "See the note above" : `${materialName}, ${ins}°C insulation · ${fmt(calc.sel.final, 1)}A after derating`}
                highlight
              />
              <Stat
                label="Conductor must carry"
                value={`${fmt(calc.needed, 1)}A`}
                sub={calc.isCont ? `${fmt(calc.I, 0)}A × 1.25 continuous — NEC 210.19(A)` : `${fmt(calc.I, 0)}A noncontinuous`}
              />
              <Stat
                label="Breaker"
                value={calc.maxed || notPermitted || calc.neededBreaker === null ? "—" : `${calc.neededBreaker}A`}
                sub={
                  calc.maxed || notPermitted
                    ? "—"
                    : `Smallest standard size ≥ ${fmt(calc.needed, 1)}A; ${calc.sel.label} allows up to ${calc.sel.breaker ?? "—"}A`
                }
              />
            </div>
          )}

          <div className="mt-6 overflow-x-auto rounded-xl border border-ink-600">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="bg-ink-900 text-left text-[11px] uppercase tracking-[0.12em] text-bone-500">
                  <th className="px-4 py-3 font-bold">Size</th>
                  <th className="px-4 py-3 font-bold">{ins}°C table</th>
                  <th className="px-4 py-3 font-bold">After derating</th>
                  <th className="px-4 py-3 font-bold">{term}°C terminal cap</th>
                  <th className="px-4 py-3 font-bold">Max breaker</th>
                  {mode === "load" ? <th className="px-4 py-3 text-right font-bold">Verdict</th> : null}
                </tr>
              </thead>
              <tbody>
                {calc.tableRows.map((r) => {
                  const isSel = r.idx === calc.sel.idx && !(mode === "load" && calc.maxed);
                  const dead = r.base === null || calc.tf === null;
                  return (
                    <tr key={r.value} className={`border-t border-ink-700 ${isSel ? "bg-safety-500/10" : ""}`}>
                      <td className="px-4 py-2.5 font-bold text-paper">
                        {r.label}
                        {isSel ? <span className="ml-2 text-xs font-bold text-safety-300">← {mode === "carry" ? "this one" : "use this"}</span> : null}
                      </td>
                      <td className="px-4 py-2.5 text-bone-300">{r.base === null ? "—" : `${r.base}A`}</td>
                      <td className={`px-4 py-2.5 ${dead ? "text-ember-400" : r.cappedByTerm ? "text-bone-500" : "text-bone-300"}`}>
                        {dead ? "—" : `${fmt(r.derated, 1)}A`}
                        {!dead && r.cappedByTerm ? <span className="ml-1 text-xs">→ {r.termCap}A</span> : null}
                      </td>
                      <td className="px-4 py-2.5 text-bone-300">{r.termCap === null ? "—" : `${r.termCap}A`}</td>
                      <td className="px-4 py-2.5 text-bone-300">
                        {r.breaker === null ? "—" : `${r.breaker}A`}
                        {r.smallCap !== undefined && r.breaker === r.smallCap ? <span className="ml-1 text-xs text-bone-500">240.4(D)</span> : null}
                      </td>
                      {mode === "load" ? (
                        <td className={`px-4 py-2.5 text-right font-bold ${r.ok ? "text-emerald-400" : "text-ember-400"}`}>
                          {r.ok ? "✓" : dead ? "✗ n/a" : r.final < calc.needed ? "✗ amps" : "✗ breaker"}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-bone-500">
            After derating = table × ambient factor × conductor-count factor, then held to the terminal column. Below
            21°C ambient this tool uses 1.00 rather than the table&apos;s uplift.
          </p>

          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </>
      ) : (
        <p className="mt-6 text-sm text-bone-500">
          {mode === "load" ? "Enter the load current to size the wire." : "Enter the ambient temperature and conductor count."}
        </p>
      )}
    </div>
  );
}
