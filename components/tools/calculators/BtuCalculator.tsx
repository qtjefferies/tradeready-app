"use client";

import { useMemo, useState } from "react";
import { CheckRow, Field, Seg, SliderInput, Stat, fmt } from "../ui";
import { DIM, IsoBox, IsoStage, SAFETY, boxCorners, fitIso, type V3 } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Climate = "hot" | "moderate" | "cold";
type Insulation = "good" | "average" | "poor";
type Sun = "shady" | "average" | "sunny";
type Ceil = "8" | "9" | "10" | "12";

const CLIMATE_MULT: Record<Climate, number> = { hot: 1.25, moderate: 1.0, cold: 0.85 };
const INSUL_MULT: Record<Insulation, number> = { good: 0.9, average: 1.0, poor: 1.15 };
const SUN_MULT: Record<Sun, number> = { shady: 0.95, average: 1.0, sunny: 1.1 };
const CLIMATE_LABEL: Record<Climate, string> = { hot: "hot", moderate: "moderate", cold: "cold" };

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
}: {
  sqft: number;
  ceilFt: number;
  tons: number;
  recommended: number;
  occ: number;
  sun: Sun;
  climate: Climate;
}) {
  const W = 480;
  const H = 270;
  const L = Math.sqrt(sqft * (4 / 3));
  const Wd = sqft / L;
  const h = ceilFt;
  // condenser: 3 ft square footprint, height grows with tons
  const uW = Math.max(L * 0.12, 2.6);
  const uH = Math.min(Math.max(1.6 + recommended * 0.7, 2), h * 1.1);
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
    <IsoStage W={W} H={H} label={`${fmt(sqft)} square foot room with ${ceilFt} foot ceilings and a ${fmt(recommended)} ton unit`}>
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
      <ellipse cx={uTop.x} cy={uTop.y} rx={pr.ellipse(uW * 0.36).rx} ry={pr.ellipse(uW * 0.36).ry} fill="none" stroke={SAFETY} strokeWidth={1.5} />
      <text x={uTop.x} y={uTop.y - Math.max(pr.ellipse(uW * 0.36).ry, 6) - 6} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(recommended)}-ton
      </text>
      {/* labels */}
      <text x={label.x} y={label.y + 18} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(sqft)} ft²
      </text>
      <text x={hlabel.x - 8} y={hlabel.y} fill={DIM} fontSize={11} fontWeight={700} textAnchor="end">
        {ceilFt} ft
      </text>
      <text x={label.x} y={label.y + 32} fill={DIM} fontSize={11} fontWeight={700} textAnchor="middle">
        {fmt(tons)} tons of cooling load
      </text>
    </IsoStage>
  );
}

export default function BtuCalculator() {
  const [sqft, setSqft] = useState("1500");
  const [ceil, setCeil] = useState<Ceil>("8");
  const [climate, setClimate] = useState<Climate>("moderate");
  const [insul, setInsul] = useState<Insulation>("average");
  const [sun, setSun] = useState<Sun>("average");
  const [occupants, setOccupants] = useState("2");
  const [kitchen, setKitchen] = useState(true);

  const result = useMemo(() => {
    const s = parseFloat(sqft);
    if (!isFinite(s) || s <= 0) return null;
    const occ = Math.max(0, parseInt(occupants || "0", 10) || 0);
    let btu = s * 20;
    btu *= CLIMATE_MULT[climate];
    btu *= parseInt(ceil, 10) / 8;
    btu *= INSUL_MULT[insul];
    btu *= SUN_MULT[sun];
    btu += Math.max(0, occ - 2) * 600;
    if (kitchen) btu += 4000;
    const tons = btu / 12000;
    const recommended = Math.ceil(tons * 2) / 2;
    return { btu: Math.round(btu), tons, recommended, sqft: s, ceil, climate, occ, kitchen, sun };
  }, [sqft, ceil, climate, insul, sun, occupants, kitchen]);

  const buildPayload = (): ToolQuotePayload | null => {
    if (!result) return null;
    return {
      source: "BTU calculator",
      sourceHref: "/tools/hvac/btu-calculator",
      title: `AC install — ${fmt(result.recommended)}-ton`,
      notes:
        `Load calc: ${fmt(result.btu)} BTU/hr (${fmt(result.tons)} tons) for ${fmt(result.sqft)} ft², ` +
        `${result.ceil}-ft ceilings, ${CLIMATE_LABEL[result.climate]} climate` +
        `${result.kitchen ? ", kitchen in zone" : ""}.\n` +
        `Quoted at ${fmt(result.recommended)}-ton (rounded up to nearest half-ton).\n` +
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
    ? `AC sizing: ${fmt(result.sqft)} ft² needs ${fmt(result.btu)} BTU/hr (${fmt(result.tons)} tons) → shop for a ${fmt(result.recommended)}-ton unit.`
    : "";

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Area to cool" hint="Square footage of the space — drag or type.">
          <SliderInput value={sqft} onChange={setSqft} min={100} max={5000} step={50} suffix="ft²" ariaLabel="Square footage" />
        </Field>
        <Field label="Ceiling height">
          <Seg<Ceil>
            ariaLabel="Ceiling height"
            value={ceil}
            onChange={setCeil}
            options={[
              { value: "8", label: "8 ft" },
              { value: "9", label: "9 ft" },
              { value: "10", label: "10 ft" },
              { value: "12", label: "12 ft" },
            ]}
          />
        </Field>
        <Field label="Climate">
          <Seg<Climate>
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
          <Seg<Insulation>
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
          <Seg<Sun>
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
      <div className="mt-5">
        <CheckRow
          checked={kitchen}
          onChange={setKitchen}
          label="Includes a kitchen"
          hint="Kitchens throw a lot of heat — adds 4,000 BTU/hr"
        />
      </div>

      {result ? (
        <div className="mt-2">
          <RoomScene
            sqft={result.sqft}
            ceilFt={parseInt(result.ceil, 10)}
            tons={result.tons}
            recommended={result.recommended}
            occ={result.occ}
            sun={result.sun}
            climate={result.climate}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Cooling needed" value={`${fmt(result.btu)} BTU/hr`} highlight />
            <Stat label="That's" value={`${fmt(result.tons)} tons`} sub="12,000 BTU/hr = 1 ton" />
            <Stat
              label="Shop for"
              value={`${fmt(result.recommended)}-ton`}
              sub="Rounded up to the nearest half-ton — undersized units never catch up"
            />
          </div>
          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter the area to size the system.</p>
      )}
    </div>
  );
}
