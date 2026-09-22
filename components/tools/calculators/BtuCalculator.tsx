"use client";

import { useMemo, useState } from "react";
import { CheckRow, Field, NumInput, Seg, Stat, fmt } from "../ui";

type Climate = "hot" | "moderate" | "cold";
type Insulation = "good" | "average" | "poor";
type Sun = "shady" | "average" | "sunny";
type Ceil = "8" | "9" | "10" | "12";

const CLIMATE_MULT: Record<Climate, number> = { hot: 1.25, moderate: 1.0, cold: 0.85 };
const INSUL_MULT: Record<Insulation, number> = { good: 0.9, average: 1.0, poor: 1.15 };
const SUN_MULT: Record<Sun, number> = { shady: 0.95, average: 1.0, sunny: 1.1 };

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
    return { btu: Math.round(btu), tons, recommended };
  }, [sqft, ceil, climate, insul, sun, occupants, kitchen]);

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
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Cooling needed" value={`${fmt(result.btu)} BTU/hr`} highlight />
          <Stat label="That's" value={`${fmt(result.tons)} tons`} sub="12,000 BTU/hr = 1 ton" />
          <Stat
            label="Shop for"
            value={`${fmt(result.recommended)}-ton`}
            sub="Rounded up to the nearest half-ton — undersized units never catch up"
          />
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter the area to size the system.</p>
      )}
    </div>
  );
}
