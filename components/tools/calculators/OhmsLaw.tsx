"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { Field, SliderInput, Stat, StepSlider, fmt } from "../ui";
import { DIM, IsoBox, IsoStage, SAFETY, boxCorners, fitIso, type V3 } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Pair = "vi" | "vr" | "vp" | "ir" | "ip" | "rp";
type Quantity = "v" | "i" | "r" | "p";

const PAIRS: { value: Pair; label: string; known: [Quantity, Quantity] }[] = [
  { value: "vi", label: "V & I", known: ["v", "i"] },
  { value: "vr", label: "V & R", known: ["v", "r"] },
  { value: "vp", label: "V & P", known: ["v", "p"] },
  { value: "ir", label: "I & R", known: ["i", "r"] },
  { value: "ip", label: "I & P", known: ["i", "p"] },
  { value: "rp", label: "R & P", known: ["r", "p"] },
];

const RANGES: Record<Quantity, { label: string; hint: string; min: number; max: number; step: number; suffix: string; aria: string }> = {
  v: { label: "Voltage", hint: "Volts across the load. 120 or 240 for most residential work.", min: 1, max: 600, step: 1, suffix: "V", aria: "Voltage in volts" },
  i: { label: "Current", hint: "Amps flowing through the load.", min: 0.1, max: 200, step: 0.1, suffix: "A", aria: "Current in amps" },
  r: { label: "Resistance", hint: "Ohms. A 1,500 W space heater at 120 V is about 9.6 Ω.", min: 0.1, max: 1000, step: 0.1, suffix: "Ω", aria: "Resistance in ohms" },
  p: { label: "Power", hint: "Watts. For a resistive load, watts and volt-amps are the same thing.", min: 1, max: 50000, step: 1, suffix: "W", aria: "Power in watts" },
};

/** Standard inverse-time breaker sizes, NEC 240.6(A), through 200 A. */
const BREAKERS = [15, 20, 30, 40, 50, 60, 70, 80, 100, 125, 150, 200];

/**
 * A simple loop: source on the left, load on the right, a wire out along the
 * top and back along the bottom. The wire's thickness follows the current
 * and the bar beside the load rises with the power, both on a log scale so
 * 5 A and 150 A both still read.
 */
function CircuitScene({ V, I, R, P }: { V: number; I: number; R: number; P: number }) {
  const W = 480;
  const H = 240;
  const src = { w: 1.2, d: 0.5, h: 2.6 };
  const load = { w: 1.2, d: 0.5, h: 1.8 };
  const run = 7;
  const x0 = src.w;
  const x1 = src.w + run;
  // wire thickness: 0.07 ft at 0.1 A up to 0.34 ft at 200 A
  const wireT = 0.07 + 0.27 * Math.min(Math.max(Math.log10(I + 1) / Math.log10(201), 0), 1);
  const wireHi = 1.9;
  const wireLo = 0.35;
  // power bar: up to 5 ft tall at 50 kW
  const barMax = 5;
  const barH = Math.max(0.15, barMax * Math.min(Math.log10(P + 1) / Math.log10(50001), 1));
  const bx = x1 + load.w + 2.4;
  const bw = 0.9;
  const corners = [
    ...boxCorners(0, 0, 0, src.w, src.d, src.h),
    ...boxCorners(bx, 0, 0, bw, bw, barMax + 0.6),
    [0, -0.6, 0] as V3,
    [bx + bw, bw + 0.6, 0] as V3,
  ];
  const pr = fitIso(corners, W, H, 26);
  const { P: proj, pts } = pr;
  const y = src.d / 2 - wireT / 2;
  const srcTop = proj(src.w / 2, src.d, src.h);
  const loadTop = proj(x1 + load.w / 2, load.d, load.h);
  const mid = proj((x0 + x1) / 2, src.d, wireHi + wireT);
  const barBase = proj(bx + bw / 2, bw, 0);
  const wireColor = "#c98e1f";

  return (
    <IsoStage W={W} H={H} label={`Circuit at ${fmt(V, 1)} volts pushing ${fmt(I, 2)} amps through ${fmt(R, 2)} ohms for ${fmt(P, 0)} watts`}>
      {/* floor */}
      <polygon points={pts([-0.6, -0.6, 0], [bx + bw + 0.6, -0.6, 0], [bx + bw + 0.6, bw + 0.6, 0], [-0.6, bw + 0.6, 0])} fill="#0f1116" />
      {/* return wire (bottom) */}
      <IsoBox pr={pr} x={x0} y={y} z={wireLo} dx={run} dy={wireT} dz={wireT} top={wireColor} right="#a87515" left="#a87515" stroke="none" />
      {/* source */}
      <IsoBox pr={pr} x={0} y={0} z={0} dx={src.w} dy={src.d} dz={src.h} top="#3a3f4c" topStroke={SAFETY} />
      {/* load */}
      <IsoBox pr={pr} x={x1} y={0} z={0} dx={load.w} dy={load.d} dz={load.h} top="#3a3f4c" topStroke="#fb923c" />
      {/* supply wire (top) */}
      <IsoBox pr={pr} x={x0} y={y} z={wireHi} dx={run} dy={wireT} dz={wireT} top={SAFETY} right={wireColor} left={wireColor} stroke="none" />
      {/* power bar */}
      <IsoBox pr={pr} x={bx} y={0} z={0} dx={bw} dy={bw} dz={barH} top="#f97316" right="#c2410c" left="#9a3412" stroke="#0a0b0d" />
      {/* labels */}
      <text x={srcTop.x} y={srcTop.y - 22} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        SOURCE
      </text>
      <text x={srcTop.x} y={srcTop.y - 8} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(V, 1)}V
      </text>
      <text x={loadTop.x} y={loadTop.y - 22} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        LOAD
      </text>
      <text x={loadTop.x} y={loadTop.y - 8} fill="#fb923c" fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(R, 2)} Ω
      </text>
      <text x={mid.x} y={mid.y - 12} fill={SAFETY} fontSize={12} fontWeight={800} textAnchor="middle">
        {fmt(I, 2)} A
      </text>
      <text x={12} y={H - 10} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        Wire thickness follows current · bar height follows power
      </text>
      <text x={barBase.x} y={barBase.y + 20} fill="#fb923c" fontSize={13} fontWeight={800} textAnchor="middle">
        {P >= 1000 ? `${fmt(P / 1000, 2)} kW` : `${fmt(P, 0)} W`}
      </text>
    </IsoStage>
  );
}

export default function OhmsLaw() {
  const [q, set] = useUrlState({ k: "vi", v: "120", i: "12.5", r: "9.6", p: "1500" });
  const pair = (PAIRS.some((x) => x.value === q.k) ? q.k : "vi") as Pair;
  const setPair = set("k") as (v: Pair) => void;
  const values: Record<Quantity, string> = { v: q.v, i: q.i, r: q.r, p: q.p };
  const setters: Record<Quantity, (v: string) => void> = { v: set("v"), i: set("i"), r: set("r"), p: set("p") };
  const known = PAIRS.find((x) => x.value === pair)!.known;

  const calc = useMemo(() => {
    const vals: Record<Quantity, string> = { v: q.v, i: q.i, r: q.r, p: q.p };
    const [ka, kb] = PAIRS.find((x) => x.value === pair)!.known;
    const a = parseFloat(vals[ka]);
    const b = parseFloat(vals[kb]);
    if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0) return null;
    let V = 0;
    let I = 0;
    let R = 0;
    let P = 0;
    switch (pair) {
      case "vi":
        V = a; I = b; R = V / I; P = V * I;
        break;
      case "vr":
        V = a; R = b; I = V / R; P = (V * V) / R;
        break;
      case "vp":
        V = a; P = b; I = P / V; R = (V * V) / P;
        break;
      case "ir":
        I = a; R = b; V = I * R; P = I * I * R;
        break;
      case "ip":
        I = a; P = b; V = P / I; R = P / (I * I);
        break;
      case "rp":
        R = a; P = b; I = Math.sqrt(P / R); V = Math.sqrt(P * R);
        break;
    }
    const btu = P * 3.412;
    const kwh = P / 1000;
    const continuous = I / 0.8;
    const breaker = BREAKERS.find((bk) => bk >= continuous) ?? null;
    return { V, I, R, P, btu, kwh, continuous, breaker };
  }, [pair, q.v, q.i, q.r, q.p]);

  const isKnown = (k: Quantity) => known.includes(k);
  const label = (k: Quantity) => (isKnown(k) ? `${RANGES[k].label} (given)` : RANGES[k].label);

  const buildPayload = (): ToolQuotePayload | null => {
    if (!calc) return null;
    const { V, I, R, P, breaker } = calc;
    return {
      source: "Ohm's law calculator",
      sourceHref: "/tools/electrical/ohms-law-calculator",
      title: `Circuit — ${fmt(P, 0)} W at ${fmt(V, 0)} V`,
      notes:
        `${fmt(V, 1)} V, ${fmt(I, 2)} A, ${fmt(R, 2)} Ω, ${fmt(P, 0)} W (${fmt(calc.btu, 0)} BTU/hr, ${fmt(calc.kwh, 2)} kWh per hour of runtime).\n` +
        `Continuous-load current ${fmt(calc.continuous, 1)} A after the 80% rule (NEC 210.20(A)) — ` +
        (breaker ? `${breaker} A breaker minimum.` : "over 200 A; size the feeder and OCPD per NEC Article 215.") +
        `\nConfirm conductor ampacity per NEC 310.16 and confirm with local code.`,
      lines: [
        {
          description: breaker ? `${breaker} A breaker and circuit for ${fmt(P, 0)} W load (Ohm's law calc)` : `Circuit for ${fmt(P, 0)} W load at ${fmt(I, 1)} A (Ohm's law calc)`,
          qty: 1,
          unit_price: 0,
          kind: "materials",
        },
      ],
    };
  };

  const resultText = calc
    ? `Ohm's law: ${fmt(calc.V, 1)} V, ${fmt(calc.I, 2)} A, ${fmt(calc.R, 2)} Ω, ${fmt(calc.P, 0)} W (${fmt(calc.btu, 0)} BTU/hr). Continuous load ${fmt(calc.continuous, 1)} A → ${calc.breaker ? `${calc.breaker} A breaker` : "over 200 A"}.`
    : "";

  const stat = (k: Quantity, value: string, sub: string) => (
    <div className={isKnown(k) ? "opacity-60" : ""}>
      <Stat label={label(k)} value={value} sub={sub} highlight={!isKnown(k)} />
    </div>
  );

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Field label="What do you know?" hint="Pick the two values you have. The other two are solved for.">
            <StepSlider<Pair> ariaLabel="Known values" value={pair} onChange={setPair} options={PAIRS.map((x) => ({ value: x.value, label: x.label }))} />
          </Field>
        </div>
        {known.map((k) => (
          <Field key={k} label={RANGES[k].label} hint={RANGES[k].hint}>
            <SliderInput
              value={values[k]}
              onChange={setters[k]}
              min={RANGES[k].min}
              max={RANGES[k].max}
              step={RANGES[k].step}
              suffix={RANGES[k].suffix}
              ariaLabel={RANGES[k].aria}
            />
          </Field>
        ))}
      </div>

      {calc ? (
        <>
          <CircuitScene V={calc.V} I={calc.I} R={calc.R} P={calc.P} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stat("v", `${fmt(calc.V, 1)} V`, "V = I × R")}
            {stat("i", `${fmt(calc.I, 2)} A`, "I = V ÷ R")}
            {stat("r", `${fmt(calc.R, 2)} Ω`, "R = V ÷ I")}
            {stat("p", calc.P >= 10000 ? `${fmt(calc.P / 1000, 2)} kW` : `${fmt(calc.P, 0)} W`, "P = V × I")}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat label="Heat output" value={`${fmt(calc.btu, 0)} BTU/hr`} sub="Watts × 3.412 — every watt into a resistive load comes out as heat" />
            <Stat label="Energy per hour" value={`${fmt(calc.kwh, 2)} kWh`} sub="Multiply by your utility rate for the cost of an hour of runtime" />
            <Stat
              label="Breaker, continuous load"
              value={calc.breaker ? `${calc.breaker} A` : "> 200 A"}
              sub={
                calc.breaker
                  ? `${fmt(calc.I, 1)} A ÷ 0.8 = ${fmt(calc.continuous, 1)} A → next standard size (NEC 210.20(A), 240.6(A))`
                  : `${fmt(calc.continuous, 0)} A after the 80% rule — feeder territory, size per NEC Article 215`
              }
            />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-bone-500">
            The breaker note assumes a continuous load (3 hours or more) on a standard, non-100%-rated breaker. For a
            non-continuous load the breaker only has to be at or above {fmt(calc.I, 1)} A. Either way the wire has to be
            rated for the breaker — check NEC 310.16 and the 240.4(D) small-conductor limits.
          </p>

          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter two values above zero to solve the circuit.</p>
      )}
    </div>
  );
}
