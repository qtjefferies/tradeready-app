"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { CheckRow, Field, Seg, SliderInput, Stat, StepSlider, fmt } from "../ui";
import { DIM, IsoBox, IsoStage, SAFETY, boxCorners, fitIso, type V3 } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Climate = "hot" | "moderate" | "cold";
type Insulation = "good" | "average" | "poor";
type Sun = "shady" | "average" | "sunny";

const CLIMATE_MULT: Record<Climate, number> = { hot: 1.25, moderate: 1.0, cold: 0.85 };
const INSUL_MULT: Record<Insulation, number> = { good: 0.9, average: 1.0, poor: 1.15 };
const SUN_MULT: Record<Sun, number> = { shady: 0.95, average: 1.0, sunny: 1.1 };
const CLIMATE_LABEL: Record<Climate, string> = { hot: "hot", moderate: "moderate", cold: "cold" };

type Mode = "cool" | "heat";
type Afue = "80" | "95";
/** Heating rule of thumb, BTU/hr output per ft² for an 8-ft ceiling, by climate. */
const HEAT_BASE: Record<Climate, number> = { hot: 30, moderate: 40, cold: 55 };
/** Furnaces are sold by input rating, in these standard steps (thousands of BTU/hr). */
const FURNACE_SIZES = [40, 45, 60, 66, 80, 90, 100, 120, 140];

/**
 * The space, to scale: a 4:3 room with the real ceiling height, open on the
 * near sides so you see the floor, and a condenser outside sized to the
 * tonnage (each ton adds height). Occupants stand on the floor.
 */
function RoomScene({
  sqft,
  ceilFt,
  tons,
  recommended,
  occ,
  sun,
  climate,
  heat,
}: {
  sqft: number;
  ceilFt: number;
  tons: number;
  recommended: number;
  occ: number;
  sun: Sun;
  climate: Climate;
  heat: { out: number; furnace: number | null } | null;
}) {
  const W = 480;
  const H = 270;
  const L = Math.sqrt(sqft * (4 / 3));
  const Wd = sqft / L;
  const h = ceilFt;
  // condenser: 3 ft square footprint, height grows with tons
  const uW = Math.max(L * 0.12, 2.6);
  const uH = heat
    ? Math.min(Math.max(2.4 + (heat.furnace ?? 140) / 60, 2.5), h * 1.1)
    : Math.min(Math.max(1.6 + recommended * 0.7, 2), h * 1.1);
  const gap = L * 0.14 + 1.5;
  const ux = L + gap;
  const sunPos: V3 = [L * 0.1, -Wd * 0.35, h * 1.35];
  const corners = [...boxCorners(0, 0, 0, L, Wd, h), ...boxCorners(ux, Wd * 0.55, 0, uW, uW, uH), sunPos, [sunPos[0], sunPos[1], sunPos[2] + h * 0.35] as V3];
  const pr = fitIso(corners, W, H, 30);
  const { P, pts } = pr;
  const people = Math.min(occ, 12);
  const figs = Array.from({ length: people }, (_, i) => ({
    x: L * (0.2 + 0.6 * ((i * 0.37) % 1)),
    y: Wd * (0.2 + 0.6 * ((i * 0.61 + 0.2) % 1)),
  }));
  const figH = Math.min(5.8, h * 0.72);
  const sunGlow = sun === "sunny" ? 1 : sun === "average" ? 0.55 : 0.2;
  const sunColor = climate === "cold" ? "#9cc7ff" : climate === "hot" ? "#ff8a3d" : SAFETY;
  const sunAt = P(...sunPos);
  const label = P(L / 2, Wd, 0);
  const hlabel = P(0, 0, h / 2);
  const uTop = P(ux + uW / 2, Wd * 0.55 + uW / 2, uH);

  return (
    <IsoStage W={W} H={H} label={`${fmt(sqft)} square foot room with ${fmt(ceilFt)} foot ceilings and a ${heat ? `${heat.furnace ?? "large"}k BTU furnace` : `${fmt(recommended)} ton unit`}`}>
      {/* sun */}
      <circle cx={sunAt.x} cy={sunAt.y} r={14} fill={sunColor} opacity={0.15 + sunGlow * 0.25} />
      <circle cx={sunAt.x} cy={sunAt.y} r={7} fill={sunColor} opacity={0.5 + sunGlow * 0.5} />
      {/* floor */}
      <polygon points={pts([0, 0, 0], [L, 0, 0], [L, Wd, 0], [0, Wd, 0])} fill="#1c1f2a" stroke={DIM} strokeWidth={1.5} />
      {/* far walls: y = 0 and x = 0 */}
      <polygon points={pts([0, 0, 0], [L, 0, 0], [L, 0, h], [0, 0, h])} fill="#2c303a" stroke={DIM} strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={pts([0, 0, 0], [0, Wd, 0], [0, Wd, h], [0, 0, h])} fill="#23262e" stroke={DIM} strokeWidth={1.5} strokeLinejoin="round" />
      {/* window on the far wall, tinted by sun */}
      <polygon
        points={pts([L * 0.3, 0, h * 0.35], [L * 0.6, 0, h * 0.35], [L * 0.6, 0, h * 0.8], [L * 0.3, 0, h * 0.8])}
        fill={sunColor}
        opacity={0.12 + sunGlow * 0.35}
        stroke={DIM}
        strokeWidth={1}
      />
      {/* ceiling outline (open) */}
      <polyline points={pts([L, 0, h], [L, Wd, h], [0, Wd, h])} fill="none" stroke={DIM} strokeWidth={1} strokeDasharray="4 4" />
      {/* occupants */}
      {figs.map((f, i) => {
        const foot = P(f.x, f.y, 0);
        const top = P(f.x, f.y, figH);
        const r = Math.max(pr.k * 0.35, 2.5);
        return (
          <g key={i}>
            <line x1={foot.x} y1={foot.y} x2={top.x} y2={top.y + r} stroke="#e6e8eb" strokeWidth={Math.max(pr.k * 0.16, 1.5)} strokeLinecap="round" />
            <circle cx={top.x} cy={top.y} r={r} fill="#e6e8eb" />
          </g>
        );
      })}
      {/* condenser */}
      <IsoBox pr={pr} x={ux} y={Wd * 0.55} z={0} dx={uW} dy={uW} dz={uH} top="#3a3f4c" topStroke={SAFETY} />
      {/* fan on top */}
      {heat ? (
        <polyline points={pr.pts([ux + uW / 2, Wd * 0.55 + uW / 2, uH], [ux + uW / 2, Wd * 0.55 + uW / 2, uH + 1.2])} fill="none" stroke={DIM} strokeWidth={3} strokeLinecap="round" />
      ) : (
        <ellipse cx={uTop.x} cy={uTop.y} rx={pr.ellipse(uW * 0.36).rx} ry={pr.ellipse(uW * 0.36).ry} fill="none" stroke={SAFETY} strokeWidth={1.5} />
      )}
      <text x={uTop.x} y={uTop.y - Math.max(pr.ellipse(uW * 0.36).ry, 6) - 6} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {heat ? (heat.furnace ? `${heat.furnace}k BTU` : "140k+") : `${fmt(recommended)}-ton`}
      </text>
      {/* labels */}
      <text x={label.x} y={label.y + 18} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(sqft)} ft²
      </text>
      <text x={hlabel.x - 8} y={hlabel.y} fill={DIM} fontSize={11} fontWeight={700} textAnchor="end">
        {fmt(ceilFt)} ft
      </text>
      <text x={label.x} y={label.y + 32} fill={DIM} fontSize={11} fontWeight={700} textAnchor="middle">
        {heat ? `${fmt(heat.out)} BTU/hr heat loss` : `${fmt(tons)} tons of cooling load`}
      </text>
    </IsoStage>
  );
}

export default function BtuCalculator() {
  const [q, set] = useUrlState({
    mode: "cool",
    sqft: "1500",
    ceil: "8",
    climate: "moderate",
    insul: "average",
    sun: "average",
    occ: "2",
    kitchen: "1",
    afue: "95",
  });
  const mode = (q.mode === "heat" ? "heat" : "cool") as Mode;
  const sqft = q.sqft;
  const ceil = q.ceil;
  const climate = (["hot", "moderate", "cold"].includes(q.climate) ? q.climate : "moderate") as Climate;
  const insul = (["good", "average", "poor"].includes(q.insul) ? q.insul : "average") as Insulation;
  const sun = (["shady", "average", "sunny"].includes(q.sun) ? q.sun : "average") as Sun;
  const occupants = q.occ;
  const kitchen = q.kitchen !== "0";
  const afue = (q.afue === "80" ? "80" : "95") as Afue;
  const setMode = set("mode") as (v: Mode) => void;
  const setSqft = set("sqft");
  const setCeil = set("ceil");
  const setClimate = set("climate") as (v: Climate) => void;
  const setInsul = set("insul") as (v: Insulation) => void;
  const setSun = set("sun") as (v: Sun) => void;
  const setOccupants = set("occ");
  const setKitchen = (v: boolean) => set("kitchen")(v ? "1" : "0");
  const setAfue = set("afue") as (v: Afue) => void;

  const result = useMemo(() => {
    const s = parseFloat(sqft);
    if (!isFinite(s) || s <= 0) return null;
    const occ = Math.max(0, parseInt(occupants || "0", 10) || 0);
    let btu = s * 20;
    btu *= CLIMATE_MULT[climate];
    const ceilFt = parseFloat(ceil);
    if (!isFinite(ceilFt) || ceilFt <= 0) return null;
    btu *= ceilFt / 8;
    btu *= INSUL_MULT[insul];
    btu *= SUN_MULT[sun];
    btu += Math.max(0, occ - 2) * 600;
    if (kitchen) btu += 4000;
    const tons = btu / 12000;
    const recommended = Math.ceil(tons * 2) / 2;
    // Oversizing warning: a unit more than ~15% over the load short-cycles
    // and pulls less humidity, which is the more common field mistake.
    const oversizePct = ((recommended - tons) / tons) * 100;

    // Heating: output BTU/hr from the climate rule of thumb, scaled the same
    // way for volume and envelope; sun cuts the heating load a little.
    let heatOut = s * HEAT_BASE[climate];
    heatOut *= ceilFt / 8;
    heatOut *= INSUL_MULT[insul];
    heatOut *= sun === "sunny" ? 0.95 : sun === "shady" ? 1.05 : 1;
    const afueFrac = parseInt(afue, 10) / 100;
    const heatIn = heatOut / afueFrac;
    const furnace = FURNACE_SIZES.find((k) => k * 1000 * afueFrac >= heatOut) ?? null;
    return {
      btu: Math.round(btu),
      tons,
      recommended,
      oversizePct,
      sqft: s,
      ceil: ceilFt,
      climate,
      occ,
      kitchen,
      sun,
      heatOut: Math.round(heatOut),
      heatIn: Math.round(heatIn),
      furnace,
      afue: afueFrac,
    };
  }, [sqft, ceil, climate, insul, sun, occupants, kitchen, afue]);

  const buildPayload = (): ToolQuotePayload | null => {
    if (!result) return null;
    if (mode === "heat") {
      return {
        source: "BTU calculator",
        sourceHref: "/tools/hvac/btu-calculator",
        title: `Furnace install — ${result.furnace ? `${result.furnace}k BTU` : "over 140k BTU"}`,
        notes:
          `Heat loss estimate: ${fmt(result.heatOut)} BTU/hr output for ${fmt(result.sqft)} ft², ` +
          `${fmt(result.ceil)}-ft ceilings, ${CLIMATE_LABEL[result.climate]} climate, ${insul} insulation.\n` +
          `At ${afue}% AFUE that is ${fmt(result.heatIn)} BTU/hr input → ${result.furnace ? `${result.furnace},000 BTU/hr` : "two-stage or multiple"} furnace.\n` +
          `Rule-of-thumb estimate — confirm with a Manual J before ordering equipment.\n` +
          `Add your equipment price and labor below.`,
        lines: [
          {
            description: `${result.furnace ? `${result.furnace}k BTU/hr` : "High-output"} ${afue}% AFUE furnace — per load estimate`,
            qty: 1,
            unit_price: 0,
            kind: "materials",
          },
          { description: "Furnace installation labor", qty: 1, unit_price: 0, kind: "labor" },
        ],
      };
    }
    return {
      source: "BTU calculator",
      sourceHref: "/tools/hvac/btu-calculator",
      title: `AC install — ${fmt(result.recommended)}-ton`,
      notes:
        `Load calc: ${fmt(result.btu)} BTU/hr (${fmt(result.tons)} tons) for ${fmt(result.sqft)} ft², ` +
        `${fmt(result.ceil)}-ft ceilings, ${CLIMATE_LABEL[result.climate]} climate` +
        `${result.kitchen ? ", kitchen in zone" : ""}.\n` +
        `Quoted at ${fmt(result.recommended)}-ton (rounded up to nearest half-ton).\n` +
        `Rule-of-thumb estimate — confirm with a Manual J before ordering equipment.\n` +
        `Add your equipment price and labor below.`,
      lines: [
        {
          description: `${fmt(result.recommended)}-ton AC system — per load calculation`,
          qty: 1,
          unit_price: 0,
          kind: "materials",
        },
        { description: "HVAC installation labor", qty: 1, unit_price: 0, kind: "labor" },
      ],
    };
  };

  const resultText = result
    ? mode === "heat"
      ? `Furnace sizing: ${fmt(result.sqft)} ft² in a ${CLIMATE_LABEL[result.climate]} climate needs about ${fmt(result.heatOut)} BTU/hr output → ${result.furnace ? `${result.furnace}k BTU/hr` : "over 140k BTU/hr"} input at ${afue}% AFUE (rule of thumb; confirm with Manual J).`
      : `AC sizing: ${fmt(result.sqft)} ft² needs ${fmt(result.btu)} BTU/hr (${fmt(result.tons)} tons) → shop for a ${fmt(result.recommended)}-ton unit (rule of thumb; confirm with Manual J).`
    : "";

  return (
    <div>
      <Seg<Mode>
        ariaLabel="Cooling or heating"
        value={mode}
        onChange={setMode}
        options={[
          { value: "cool", label: "Cooling — what size AC?" },
          { value: "heat", label: "Heating — what size furnace?" },
        ]}
      />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field label={mode === "heat" ? "Area to heat" : "Area to cool"} hint="Square footage of the space — drag or type.">
          <SliderInput value={sqft} onChange={setSqft} min={100} max={5000} step={50} suffix="ft²" ariaLabel="Square footage" />
        </Field>
        <Field label="Ceiling height" hint="Taller rooms hold more air to cool.">
          <SliderInput value={ceil} onChange={setCeil} min={7} max={20} step={0.5} suffix="ft" ariaLabel="Ceiling height" />
        </Field>
        <Field label="Climate">
          <StepSlider<Climate>
            ariaLabel="Climate"
            value={climate}
            onChange={setClimate}
            options={[
              { value: "hot", label: "Hot" },
              { value: "moderate", label: "Moderate" },
              { value: "cold", label: "Cold" },
            ]}
          />
        </Field>
        <Field label="Insulation">
          <StepSlider<Insulation>
            ariaLabel="Insulation quality"
            value={insul}
            onChange={setInsul}
            options={[
              { value: "good", label: "Good" },
              { value: "average", label: "Average" },
              { value: "poor", label: "Poor" },
            ]}
          />
        </Field>
        <Field label="Sun exposure">
          <StepSlider<Sun>
            ariaLabel="Sun exposure"
            value={sun}
            onChange={setSun}
            options={[
              { value: "shady", label: "Shady" },
              { value: "average", label: "Average" },
              { value: "sunny", label: "Full sun" },
            ]}
          />
        </Field>
        <Field label="Occupants" hint="People regularly in the space.">
          <SliderInput value={occupants} onChange={setOccupants} min={0} max={12} step={1} ariaLabel="Number of occupants" />
        </Field>
      </div>
      {mode === "cool" ? (
        <div className="mt-5">
          <CheckRow
            checked={kitchen}
            onChange={setKitchen}
            label="Includes a kitchen"
            hint="Kitchens throw a lot of heat — adds 4,000 BTU/hr"
          />
        </div>
      ) : (
        <div className="mt-5">
          <Field label="Furnace efficiency (AFUE)" hint="Furnaces are sold by input BTU. Output = input × AFUE, so a 95% unit can be a size smaller.">
            <Seg<Afue>
              ariaLabel="Furnace efficiency"
              value={afue}
              onChange={setAfue}
              options={[
                { value: "80", label: "80% standard" },
                { value: "95", label: "95% condensing" },
              ]}
            />
          </Field>
        </div>
      )}

      {result ? (
        <div className="mt-2">
          <RoomScene
            sqft={result.sqft}
            ceilFt={result.ceil}
            tons={result.tons}
            recommended={result.recommended}
            occ={result.occ}
            sun={result.sun}
            climate={result.climate}
            heat={mode === "heat" ? { out: result.heatOut, furnace: result.furnace } : null}
          />
          {mode === "cool" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Cooling load" value={`${fmt(result.btu)} BTU/hr`} highlight />
              <Stat label="That's" value={`${fmt(result.tons)} tons`} sub="12,000 BTU/hr = 1 ton" />
              <Stat
                label="Shop for"
                value={`${fmt(result.recommended)}-ton`}
                sub={
                  result.oversizePct > 15
                    ? `Next half-ton up is ${fmt(result.oversizePct, 0)}% over the load — consider the half-ton below with a variable-speed unit`
                    : "Nearest half-ton up. Don't go bigger: oversized units short-cycle and leave the house clammy"
                }
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Stat label="Heat loss (output needed)" value={`${fmt(result.heatOut)} BTU/hr`} highlight />
              <Stat
                label={`Input at ${afue}% AFUE`}
                value={`${fmt(result.heatIn)} BTU/hr`}
                sub="Furnaces are rated by input — this is the number on the nameplate"
              />
              <Stat
                label="Shop for"
                value={result.furnace ? `${result.furnace}k BTU` : "Over 140k"}
                sub={
                  result.furnace
                    ? `Smallest standard input whose output (${fmt(result.furnace * 1000 * result.afue, 0)}) clears the load`
                    : "Beyond a single residential furnace — look at two units or a two-stage commercial unit"
                }
              />
            </div>
          )}
          <p className="mt-4 rounded-xl border border-ink-600 bg-ink-900 p-4 text-sm leading-relaxed text-bone-400">
            <span className="font-bold text-paper">This is a rule-of-thumb estimate,</span> good for a ballpark
            quote and for catching a badly sized unit. It doesn&apos;t see window area, orientation, duct leakage, or
            infiltration. Final equipment selection should come from an ACCA Manual J load calculation — most
            jurisdictions require one for the permit, and it is what separates a right-sized system from a callback.
          </p>
          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter the area to size the system.</p>
      )}
    </div>
  );
}
