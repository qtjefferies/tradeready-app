"use client";

import { useMemo, useState } from "react";
import { Field, NumInput, Seg, Stat, fmt, toFraction } from "../ui";

type Mode = "offset" | "stub";
type Angle = "10" | "15" | "22.5" | "30" | "45";
type Size = "1/2" | "3/4" | "1" | "1-1/4";

const MULTIPLIER: Record<Angle, number> = { "10": 6.0, "15": 3.9, "22.5": 2.6, "30": 2.0, "45": 1.4 };
const SHRINK_PER_IN: Record<Angle, number> = {
  "10": 1 / 16,
  "15": 1 / 8,
  "22.5": 3 / 16,
  "30": 1 / 4,
  "45": 3 / 8,
};
const TAKE_UP: Record<Size, number> = { "1/2": 5, "3/4": 6, "1": 8, "1-1/4": 11 };

export default function ConduitBending() {
  const [mode, setMode] = useState<Mode>("offset");
  const [depth, setDepth] = useState("6");
  const [angle, setAngle] = useState<Angle>("30");
  const [height, setHeight] = useState("12");
  const [size, setSize] = useState<Size>("1/2");

  const offset = useMemo(() => {
    const d = parseFloat(depth);
    if (!isFinite(d) || d <= 0) return null;
    const travel = d * MULTIPLIER[angle];
    const shrink = d * SHRINK_PER_IN[angle];
    return { travel, shrink };
  }, [depth, angle]);

  const stub = useMemo(() => {
    const h = parseFloat(height);
    if (!isFinite(h) || h <= 0) return null;
    const takeUp = TAKE_UP[size];
    return { mark: h - takeUp, takeUp };
  }, [height, size]);

  return (
    <div>
      <Seg<Mode>
        ariaLabel="Bend type"
        value={mode}
        onChange={setMode}
        options={[
          { value: "offset", label: "Offset bend" },
          { value: "stub", label: "90° stub-up" },
        ]}
      />

      {mode === "offset" ? (
        <div className="mt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Offset depth" hint="How far the conduit has to jog — e.g. to clear a 6-inch beam.">
              <NumInput value={depth} onChange={setDepth} min={0.5} suffix="in" ariaLabel="Offset depth in inches" />
            </Field>
            <Field label="Bend angle" hint="30° is the workhorse for most offsets.">
              <Seg<Angle>
                ariaLabel="Bend angle"
                value={angle}
                onChange={setAngle}
                options={[
                  { value: "10", label: "10°" },
                  { value: "15", label: "15°" },
                  { value: "22.5", label: "22.5°" },
                  { value: "30", label: "30°" },
                  { value: "45", label: "45°" },
                ]}
              />
            </Field>
          </div>

          {offset ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Distance between marks"
                value={toFraction(offset.travel)}
                sub={`${fmt(offset.travel)} in decimal · multiplier ${MULTIPLIER[angle].toFixed(1)}`}
                highlight
              />
              <Stat
                label="Shrink"
                value={toFraction(offset.shrink)}
                sub="The run gets shorter by this much — allow for it"
              />
              <Stat
                label="How to mark it"
                value="Mark 1 → 2"
                sub={`Mark 1 where the offset starts, measure ${toFraction(offset.travel)} down the conduit, mark 2, bend ${angle}° at each`}
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-bone-500">Enter an offset depth to get your marks.</p>
          )}
        </div>
      ) : (
        <div className="mt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Stub height" hint="Finished height of the 90° stub, floor to top.">
              <NumInput value={height} onChange={setHeight} min={1} suffix="in" ariaLabel="Stub height in inches" />
            </Field>
            <Field label="Conduit size (EMT)" hint="Take-up is deducted for the bender's radius.">
              <Seg<Size>
                ariaLabel="Conduit size"
                value={size}
                onChange={setSize}
                options={[
                  { value: "1/2", label: '1/2"' },
                  { value: "3/4", label: '3/4"' },
                  { value: "1", label: '1"' },
                  { value: "1-1/4", label: '1-1/4"' },
                ]}
              />
            </Field>
          </div>

          {stub ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat
                label="Mark the conduit at"
                value={toFraction(stub.mark)}
                sub={`${fmt(stub.mark)} in decimal, measured from the end`}
                highlight
              />
              <Stat label="Take-up deducted" value={toFraction(stub.takeUp)} sub={`Standard for ${size}" EMT`} />
              <Stat
                label="How to bend it"
                value="Arrow at mark"
                sub="Put the bender's arrow (or star) on the mark and pull to 90°"
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-bone-500">Enter a stub height to get your mark.</p>
          )}
        </div>
      )}
    </div>
  );
}
