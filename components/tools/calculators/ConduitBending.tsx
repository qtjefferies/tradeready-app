"use client";

import { useMemo, useState } from "react";
import { Field, NumInput, Seg, Stat, fmt, toFraction } from "../ui";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

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

const SAFETY = "#f5b83d";
const DIM = "#8a8fa0";

/** Schematic of the offset: where to put mark 1, mark 2, and how far apart. */
function OffsetDiagram({ travel, depth, angleDeg }: { travel: number; depth: number; angleDeg: number }) {
  const W = 440;
  const H = 250;
  const padL = 20;
  const padR = 20;
  const padB = 58;
  const availW = W - padL - padR;
  const s = Math.min((availW - 110) / Math.max(travel, 0.5), 105 / Math.max(depth, 0.5), 14);
  const x1 = padL + 46;
  const yBase = H - padB;
  const dx = Math.max(travel * s, 8);
  const dy = Math.max(depth * s, 8);
  const x2 = x1 + dx;
  const y2 = yBase - dy;
  const a = (angleDeg * Math.PI) / 180;
  const arcR = 30;
  const arcX = x1 + arcR * Math.cos(a);
  const arcY = yBase - arcR * Math.sin(a);
  const dimY = yBase + 30;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" role="img" aria-label="Offset bend diagram">
      {/* conduit runs */}
      <line x1={padL} y1={yBase} x2={x1} y2={yBase} stroke={SAFETY} strokeWidth={11} strokeLinecap="round" />
      <line x1={x1} y1={yBase} x2={x2} y2={y2} stroke={SAFETY} strokeWidth={11} strokeLinecap="round" />
      <line x1={x2} y1={y2} x2={W - padR} y2={y2} stroke={SAFETY} strokeWidth={11} strokeLinecap="round" />
      {/* bend angle arc */}
      <path
        d={`M ${x1 + arcR} ${yBase} A ${arcR} ${arcR} 0 0 0 ${arcX} ${arcY}`}
        fill="none"
        stroke={DIM}
        strokeWidth={1.5}
      />
      <text x={x1 + arcR + 6} y={yBase - 6} fill={DIM} fontSize={12} fontWeight={700}>
        {angleDeg}°
      </text>
      {/* marks */}
      <line x1={x1} y1={yBase - 16} x2={x1} y2={yBase + 16} stroke="#fff" strokeWidth={2.5} />
      <text x={x1} y={yBase + 30} fill="#fff" fontSize={12} fontWeight={800} textAnchor="middle" dy={-34}>
        M1
      </text>
      <line x1={x2} y1={y2 - 16} x2={x2} y2={y2 + 16} stroke="#fff" strokeWidth={2.5} />
      <text x={x2} y={y2 - 22} fill="#fff" fontSize={12} fontWeight={800} textAnchor="middle">
        M2
      </text>
      {/* travel dimension */}
      <line x1={x1} y1={dimY} x2={x2} y2={dimY} stroke={DIM} strokeWidth={1.5} />
      <line x1={x1} y1={dimY - 6} x2={x1} y2={dimY + 6} stroke={DIM} strokeWidth={1.5} />
      <line x1={x2} y1={dimY - 6} x2={x2} y2={dimY + 6} stroke={DIM} strokeWidth={1.5} />
      <text x={(x1 + x2) / 2} y={dimY + 20} fill={SAFETY} fontSize={15} fontWeight={800} textAnchor="middle">
        {toFraction(travel)}
      </text>
      {/* depth dimension */}
      <line x1={x2 + 18} y1={yBase} x2={x2 + 18} y2={y2} stroke={DIM} strokeWidth={1.5} />
      <line x1={x2 + 12} y1={yBase} x2={x2 + 24} y2={yBase} stroke={DIM} strokeWidth={1.5} />
      <line x1={x2 + 12} y1={y2} x2={x2 + 24} y2={y2} stroke={DIM} strokeWidth={1.5} />
      <text
        x={x2 + 30}
        y={(yBase + y2) / 2}
        fill={DIM}
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
        transform={`rotate(-90 ${x2 + 30} ${(yBase + y2) / 2})`}
      >
        {toFraction(depth)} offset
      </text>
    </svg>
  );
}

/** Schematic of the 90° stub: the mark goes take-up below the finished height. */
function StubDiagram({ height, mark, takeUp }: { height: number; mark: number; takeUp: number }) {
  const W = 220;
  const H = 260;
  const padB = 30;
  const padT = 24;
  const s = (H - padB - padT) / Math.max(height, 1);
  const cx = 84;
  const yFloor = H - padB;
  const yTop = yFloor - height * s;
  const yMark = yFloor - mark * s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-6 w-full" role="img" aria-label="Stub-up diagram">
      {/* floor line */}
      <line x1={16} y1={yFloor} x2={W - 16} y2={yFloor} stroke={DIM} strokeWidth={2} />
      {/* conduit: foot + riser */}
      <line x1={36} y1={yFloor} x2={cx} y2={yFloor} stroke={SAFETY} strokeWidth={11} strokeLinecap="round" />
      <line x1={cx} y1={yFloor} x2={cx} y2={yTop} stroke={SAFETY} strokeWidth={11} strokeLinecap="round" />
      {/* mark */}
      <line x1={cx - 22} y1={yMark} x2={cx + 22} y2={yMark} stroke="#fff" strokeWidth={2.5} />
      <text x={cx + 30} y={yMark + 4} fill="#fff" fontSize={12} fontWeight={800}>
        mark {toFraction(mark)}
      </text>
      {/* height dimension */}
      <line x1={cx + 64} y1={yFloor} x2={cx + 64} y2={yTop} stroke={DIM} strokeWidth={1.5} />
      <text
        x={cx + 78}
        y={(yFloor + yTop) / 2}
        fill={DIM}
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
        transform={`rotate(-90 ${cx + 78} ${(yFloor + yTop) / 2})`}
      >
        {toFraction(height)}
      </text>
      <text x={cx - 34} y={yFloor - 8} fill={DIM} fontSize={11} fontWeight={700} textAnchor="end">
        take-up {toFraction(takeUp)}
      </text>
    </svg>
  );
}

export default function ConduitBending() {
  const [mode, setMode] = useState<Mode>("offset");
  const [depth, setDepth] = useState("6");
  const [angle, setAngle] = useState<Angle>("30");
  const [height, setHeight] = useState("12");
  const [size, setSize] = useState<Size>("1/2");

  const offset = useMemo(() => {
    const d = parseFloat(depth);
    if (!isFinite(d) || d <= 0) return null;
    return { d, travel: d * MULTIPLIER[angle], shrink: d * SHRINK_PER_IN[angle] };
  }, [depth, angle]);

  const stub = useMemo(() => {
    const h = parseFloat(height);
    if (!isFinite(h) || h <= 0) return null;
    const takeUp = TAKE_UP[size];
    return { h, takeUp, mark: h - takeUp };
  }, [height, size]);

  const buildPayload = (): ToolQuotePayload | null => {
    if (mode === "offset") {
      if (!offset) return null;
      return {
        source: "Conduit bending calculator",
        sourceHref: "/tools/electrical/conduit-bending-calculator",
        title: "Conduit run — offset bends",
        notes:
          `Offset ${toFraction(offset.d)} at ${angle}°.\n` +
          `Mark 1 where the offset starts, mark 2 ${toFraction(offset.travel)} down the conduit.\n` +
          `Allow ${toFraction(offset.shrink)} of shrink in the run.`,
        lines: [{ description: "Conduit run — bending and installation labor", qty: 1, unit_price: 0, kind: "labor" }],
      };
    }
    if (!stub || stub.mark <= 0) return null;
    return {
      source: "Conduit bending calculator",
      sourceHref: "/tools/electrical/conduit-bending-calculator",
      title: `Conduit stub-up — ${toFraction(stub.h)}`,
      notes: `90° stub ${toFraction(stub.h)} in ${size}" EMT.\nMark the conduit at ${toFraction(stub.mark)} (take-up ${toFraction(stub.takeUp)} deducted). Arrow on the mark, pull to 90°.`,
      lines: [{ description: "Conduit stub-up — bending and installation labor", qty: 1, unit_price: 0, kind: "labor" }],
    };
  };

  const resultText = (() => {
    if (mode === "offset" && offset)
      return `Conduit offset: ${toFraction(offset.d)} at ${angle}° → marks ${toFraction(offset.travel)} apart, shrink ${toFraction(offset.shrink)}.`;
    if (mode === "stub" && stub) return `90° stub ${toFraction(stub.h)} in ${size}" EMT → mark at ${toFraction(stub.mark)}.`;
    return "";
  })();

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
            <>
              <OffsetDiagram travel={offset.travel} depth={offset.d} angleDeg={parseFloat(angle)} />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  label="How to bend it"
                  value={`${angle}° × 2`}
                  sub="Same angle at each mark, opposite directions"
                />
              </div>
              <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
            </>
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

          {stub && stub.mark > 0 ? (
            <>
              <div className="mx-auto max-w-[260px]">
                <StubDiagram height={stub.h} mark={stub.mark} takeUp={stub.takeUp} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
              <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
            </>
          ) : (
            <p className="mt-6 text-sm text-bone-500">
              {stub ? "The stub must be taller than the take-up." : "Enter a stub height to get your mark."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
