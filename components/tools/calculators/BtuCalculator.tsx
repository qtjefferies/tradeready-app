"use client";

import { useMemo, useState } from "react";
import { CheckRow, Field, NumInput, Seg, Stat, fmt } from "../ui";
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

const SAFETY = "#f5b83d";
const DIM = "#8a8fa0";

/** Half-donut gauge, 0–5 tons, needle at the load. */
function TonsGauge({ tons }: { tons: number }) {
  const cx = 130;
  const cy = 112;
  const r = 88;
  const max = 5;
  const frac = Math.min(Math.max(tons / max, 0), 1);
  const ang = Math.PI * (1 - frac);
  const nx = cx + r * Math.cos(ang);
  const ny = cy - r * Math.sin(ang);
  const ticks = [0, 1, 2, 3, 4, 5].map((t) => {
    const a = Math.PI * (1 - t / max);
    return {
      t,
      x1: cx + (r - 12) * Math.cos(a),
      y1: cy - (r - 12) * Math.sin(a),
      x2: cx + r * Math.cos(a),
      y2: cy - r * Math.sin(a),
      lx: cx + (r - 26) * Math.cos(a),
      ly: cy - (r - 26) * Math.sin(a),
    };
  });
  return (
    <svg viewBox="0 0 260 132" className="mx-auto mt-6 w-full max-w-[320px]" role="img" aria-label={`${fmt(tons)} tons`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#2c303a" strokeWidth={14} strokeLinecap="round" />
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${nx} ${ny}`}
        fill="none"
        stroke={SAFETY}
        strokeWidth={14}
        strokeLinecap="round"
      />
      {ticks.map((k) => (
        <g key={k.t}>
          <line x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke={DIM} strokeWidth={2} />
          <text x={k.lx} y={k.ly + 4} fill={DIM} fontSize={10} fontWeight={700} textAnchor="middle">
            {k.t}
          </text>
        </g>
      ))}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={7} fill="#fff" />
      <text x={cx} y={cy + 2.5} fill="#0a0b0d" fontSize={8} fontWeight={900} textAnchor="middle">
        T
      </text>
    </svg>
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
    return { btu: Math.round(btu), tons, recommended, sqft: s, ceil, climate, occ, kitchen };
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
        <Field label="Area to cool" hint="Square footage of the space.">
          <NumInput value={sqft} onChange={setSqft} min={50} suffix="ft²" ariaLabel="Square footage" />
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
          <NumInput value={occupants} onChange={setOccupants} min={0} step="1" ariaLabel="Number of occupants" />
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
          <TonsGauge tons={result.tons} />
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
