"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { Field, Seg, SliderInput, Stat, fmt } from "../ui";
import { DIM, INK, IsoBox, IsoCylinder, IsoStage, SAFETY, boxCorners, fitIso } from "../iso";

type Shape = "slab" | "footing" | "column" | "stairs";

/** Ready-mix plants sell in quarter-yard increments. */
function quarterYards(yd: number): number {
  return Math.ceil(yd * 4 - 1e-9) / 4;
}
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

/**
 * True-proportion slab. Footprint and thickness use the real ratios (thickness
 * clamped so a 4-in slab on a 40-ft driveway is still visible), with a 6-ft
 * figure standing beside it for scale. Auto-fitted, so it never overflows.
 */
function SlabScene({ l, w, tIn }: { l: number; w: number; tIn: number }) {
  const W = 480;
  const H = 260;
  const t = Math.max(tIn / 12, Math.max(l, w) * 0.035); // ft, keep the edge readable
  const figH = 6;
  const gap = Math.max(l, w) * 0.12 + 1;
  const fx = l * 0.5;
  const fy = w + gap + 0.6;
  const corners = [...boxCorners(0, 0, 0, l, w, t), ...boxCorners(fx - 0.6, fy - 0.6, 0, 1.2, 1.2, figH)];
  const pr = fitIso(corners, W, H, 34);
  const { P } = pr;
  // labels
  const lenA = P(0, 0, t);
  const lenB = P(l, 0, t);
  const widA = P(l, 0, 0);
  const widB = P(l, w, 0);
  const thA = P(l, w, 0);
  const thB = P(l, w, t);
  // figure
  const head = P(fx, fy, figH - 0.4);
  const neck = P(fx, fy, figH - 0.9);
  const hip = P(fx, fy, figH * 0.5);
  const footL = P(fx - 0.4, fy + 0.3, 0);
  const footR = P(fx + 0.4, fy - 0.3, 0);
  const handL = P(fx - 0.6, fy + 0.4, figH * 0.5);
  const handR = P(fx + 0.6, fy - 0.4, figH * 0.5);
  const sh = P(fx, fy, figH - 1.2);
  const headR = Math.max(pr.k * 0.4, 3);
  const grid = Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(l, w)))) / 2);
  const gridLines: string[] = [];
  for (let gx = grid; gx < l; gx += grid) gridLines.push(pr.pts([gx, 0, t], [gx, w, t]));
  for (let gy = grid; gy < w; gy += grid) gridLines.push(pr.pts([0, gy, t], [l, gy, t]));

  return (
    <IsoStage W={W} H={H} label={`Slab ${fmt(l)} by ${fmt(w)} feet, ${fmt(tIn)} inches thick`}>
      {/* ground shadow */}
      <polygon
        points={pr.pts([-l * 0.05, -w * 0.05, 0], [l * 1.05, -w * 0.05, 0], [l * 1.05, w * 1.05, 0], [-l * 0.05, w * 1.05, 0])}
        fill="#0f1116"
      />
      <IsoBox pr={pr} x={0} y={0} z={0} dx={l} dy={w} dz={t} top="#4a4f5c" topStroke={SAFETY} />
      {gridLines.map((g, i) => (
        <polyline key={i} points={g} fill="none" stroke="#6b7080" strokeWidth={0.75} opacity={0.5} />
      ))}
      {/* figure for scale */}
      <g stroke="#e6e8eb" strokeWidth={Math.max(pr.k * 0.18, 2)} strokeLinecap="round" fill="none">
        <line x1={neck.x} y1={neck.y} x2={hip.x} y2={hip.y} />
        <line x1={hip.x} y1={hip.y} x2={footL.x} y2={footL.y} />
        <line x1={hip.x} y1={hip.y} x2={footR.x} y2={footR.y} />
        <line x1={sh.x} y1={sh.y} x2={handL.x} y2={handL.y} />
        <line x1={sh.x} y1={sh.y} x2={handR.x} y2={handR.y} />
      </g>
      <circle cx={head.x} cy={head.y} r={headR} fill="#e6e8eb" />
      {/* dimension labels */}
      <text x={(lenA.x + lenB.x) / 2 + 10} y={(lenA.y + lenB.y) / 2 - 10} fill={SAFETY} fontSize={14} fontWeight={800} textAnchor="start">
        {fmt(l)} ft
      </text>
      <text x={(widA.x + widB.x) / 2 + 12} y={(widA.y + widB.y) / 2 - 4} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="start">
        {fmt(w)} ft
      </text>
      <text x={thA.x + 10} y={(thA.y + thB.y) / 2 + 18} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        {fmt(tIn)} in thick
      </text>
      <text x={W - 12} y={H - 10} fill="#565b64" fontSize={10} fontWeight={700} textAnchor="end">
        Figure is 6 ft · grid every {fmt(grid)} ft
      </text>
    </IsoStage>
  );
}


/** Continuous footing: long, narrow, deep — drawn in a trench. */
function FootingScene({ l, wIn, dIn }: { l: number; wIn: number; dIn: number }) {
  const W = 480;
  const H = 240;
  const w = wIn / 12;
  const d = dIn / 12;
  const pr = fitIso([...boxCorners(-0.6, -0.6, -d, l + 1.2, w + 1.2, d + 0.3)], W, H, 34);
  const { pts } = pr;
  return (
    <IsoStage W={W} H={H} label={`Footing ${fmt(l)} feet long, ${fmt(wIn)} inches wide, ${fmt(dIn)} inches deep`}>
      {/* grade around the trench */}
      <polygon points={pts([-0.6, -0.6, 0], [l + 0.6, -0.6, 0], [l + 0.6, w + 0.6, 0], [-0.6, w + 0.6, 0])} fill="#1c1f2a" stroke={DIM} strokeWidth={1.5} />
      {/* trench walls */}
      <polygon points={pts([0, 0, 0], [l, 0, 0], [l, 0, -d], [0, 0, -d])} fill="#15171d" stroke={DIM} strokeWidth={1} />
      <polygon points={pts([0, 0, 0], [0, w, 0], [0, w, -d], [0, 0, -d])} fill="#121419" stroke={DIM} strokeWidth={1} />
      {/* concrete filling the trench to grade */}
      <IsoBox pr={pr} x={0} y={0} z={-d} dx={l} dy={w} dz={d} top="#4a4f5c" topStroke={SAFETY} />
      <text x={pr.P(l / 2, 0, 0).x + 10} y={pr.P(l / 2, 0, 0).y - 12} fill={SAFETY} fontSize={14} fontWeight={800}>
        {fmt(l)} ft
      </text>
      <text x={pr.P(l, w / 2, 0).x + 12} y={pr.P(l, w / 2, 0).y} fill={SAFETY} fontSize={12} fontWeight={800}>
        {fmt(wIn)} in wide
      </text>
      <text x={pr.P(l, w, -d / 2).x + 12} y={pr.P(l, w, -d / 2).y + 4} fill={DIM} fontSize={11} fontWeight={700}>
        {fmt(dIn)} in deep
      </text>
    </IsoStage>
  );
}

/** Round columns (sonotubes) side by side, at true diameter and height. */
function ColumnScene({ dIn, h, count }: { dIn: number; h: number; count: number }) {
  const W = 480;
  const H = 260;
  const r = dIn / 24;
  const n = Math.min(count, 8);
  const gap = r * 2 * 0.9 + 0.4;
  const corners = [...boxCorners(-r, -r, 0, (n - 1) * gap + r * 2, r * 2, h)];
  const pr = fitIso(corners, W, H, 34);
  const figCorner = pr.P(0, r, 0);
  return (
    <IsoStage W={W} H={H} label={`${count} round column${count === 1 ? "" : "s"}, ${fmt(dIn)} inches diameter, ${fmt(h)} feet tall`}>
      {Array.from({ length: n }, (_, i) => (
        <IsoCylinder key={i} pr={pr} cx={i * gap} cy={0} z={0} r={r} h={h} body={INK.right} top="#4a4f5c" />
      ))}
      <text x={figCorner.x} y={figCorner.y + 22} fill={SAFETY} fontSize={13} fontWeight={800}>
        {fmt(dIn)} in dia × {fmt(h)} ft{count > n ? ` · showing ${n} of ${count}` : ""}
      </text>
    </IsoStage>
  );
}

/** Solid stairs: each step is a full-width block, so volume is exact. */
function StairsScene({ wFt, n, riseIn, runIn }: { wFt: number; n: number; riseIn: number; runIn: number }) {
  const W = 480;
  const H = 260;
  const rise = riseIn / 12;
  const run = runIn / 12;
  const steps = Math.min(n, 16);
  const corners = [...boxCorners(0, 0, 0, run * steps, wFt, rise * steps)];
  const pr = fitIso(corners, W, H, 34);
  const blocks = [];
  // Draw back to front so nearer steps overlap farther ones correctly.
  for (let i = 0; i < steps; i++) {
    const x = i * run; // step i starts at x and reaches the top at (steps - i) * rise
    blocks.push(<IsoBox key={i} pr={pr} x={x} y={0} z={0} dx={run} dy={wFt} dz={rise * (steps - i)} top="#4a4f5c" topStroke={SAFETY} />);
  }
  const lab = pr.P(run * steps, wFt / 2, 0);
  return (
    <IsoStage W={W} H={H} label={`${n} concrete steps, ${fmt(wFt)} feet wide, ${fmt(riseIn)} inch rise, ${fmt(runIn)} inch run`}>
      {blocks}
      <text x={lab.x + 10} y={lab.y + 4} fill={SAFETY} fontSize={12} fontWeight={800}>
        {fmt(wFt)} ft wide
      </text>
      <text x={pr.P(0, wFt, rise * steps).x - 8} y={pr.P(0, wFt, rise * steps).y - 8} fill={DIM} fontSize={11} fontWeight={700} textAnchor="end">
        {n} × {fmt(riseIn)} in rise, {fmt(runIn)} in run
      </text>
    </IsoStage>
  );
}

export default function ConcreteCalculator() {
  const [q, set] = useUrlState({
    shape: "slab",
    l: "10",
    w: "10",
    t: "4",
    fl: "40",
    fw: "16",
    fd: "8",
    cd: "12",
    ch: "4",
    cn: "4",
    sw: "4",
    sn: "3",
    sr: "7",
    srun: "11",
  });
  const shape = (["slab", "footing", "column", "stairs"].includes(q.shape) ? q.shape : "slab") as Shape;
  const setShape = set("shape") as (v: Shape) => void;
  const { l: length, w: width, t: thick } = q;
  const setLength = set("l");
  const setWidth = set("w");
  const setThick = set("t");

  const result = useMemo(() => {
    const num = (v: string) => {
      const n = parseFloat(v);
      return isFinite(n) && n > 0 ? n : null;
    };
    let cuft: number | null = null;
    let title = "";
    let desc = "";
    let dims: Record<string, number> = {};
    if (shape === "slab") {
      const l = num(q.l);
      const w = num(q.w);
      const t = num(q.t);
      if (l && w && t) {
        cuft = (l * w * t) / 12;
        dims = { l, w, t };
        title = `Concrete slab — ${fmt(l)}×${fmt(w)} ft`;
        desc = `Slab ${fmt(l)} × ${fmt(w)} ft, ${fmt(t)} in thick`;
      }
    } else if (shape === "footing") {
      const l = num(q.fl);
      const w = num(q.fw);
      const d = num(q.fd);
      if (l && w && d) {
        cuft = (l * (w / 12) * d) / 12;
        dims = { l, w, d };
        title = `Concrete footing — ${fmt(l)} ft`;
        desc = `Footing ${fmt(l)} ft long, ${fmt(w)} in wide, ${fmt(d)} in deep`;
      }
    } else if (shape === "column") {
      const d = num(q.cd);
      const h = num(q.ch);
      const n = Math.max(1, Math.round(parseFloat(q.cn) || 1));
      if (d && h) {
        cuft = Math.PI * Math.pow(d / 24, 2) * h * n;
        dims = { d, h, n };
        title = `Concrete columns — ${n} × ${fmt(d)} in`;
        desc = `${n} round column${n === 1 ? "" : "s"}, ${fmt(d)} in diameter, ${fmt(h)} ft tall`;
      }
    } else {
      const w = num(q.sw);
      const n = Math.max(1, Math.round(parseFloat(q.sn) || 1));
      const r = num(q.sr);
      const run = num(q.srun);
      if (w && r && run) {
        // Solid steps: step i (from the top) is a block run × w × (i × rise) → Σ = n(n+1)/2
        cuft = (w * (r / 12) * (run / 12) * n * (n + 1)) / 2;
        dims = { w, n, r, run };
        title = `Concrete steps — ${n} steps, ${fmt(w)} ft wide`;
        desc = `${n} solid steps, ${fmt(w)} ft wide, ${fmt(r)} in rise, ${fmt(run)} in run`;
      }
    }
    if (cuft === null) return null;
    const cuyd = cuft / 27;
    const exactWithWaste = cuyd * 1.1; // 10% waste
    const order = quarterYards(exactWithWaste);
    const withWaste = cuft * 1.05;
    return {
      shape,
      dims,
      title,
      desc,
      cuft,
      cuyd,
      exactWithWaste,
      order,
      bags80: Math.ceil(withWaste / 0.6),
      bags60: Math.ceil(withWaste / 0.45),
      bags40: Math.ceil(withWaste / 0.3),
      bagJob: exactWithWaste <= 1,
    };
  }, [shape, q]);

  const buildPayload = (): ToolQuotePayload | null => {
    if (!result) return null;
    return {
      source: "Concrete calculator",
      sourceHref: "/tools/general/concrete-calculator",
      title: result.title,
      notes:
        `${result.desc}: ${fmt(result.cuyd)} yd³ exact.\n` +
        `Order ${fmt(result.order)} yd³ ready-mix (10% waste, rounded up to the quarter yard) or ${fmt(result.bags80)} × 80-lb bags.\n` +
        `Add your material price and labor below.`,
      lines: [
        {
          description: `Concrete — ${fmt(result.order)} yd³ delivered (10% waste incl.)`,
          qty: result.order,
          unit_price: 0,
          kind: "materials",
        },
        { description: "Concrete labor — forming, pouring, finishing", qty: 1, unit_price: 0, kind: "labor" },
      ],
    };
  };

  const resultText = result
    ? `${result.desc} → ${fmt(result.cuyd)} yd³ exact; order ${fmt(result.order)} yd³ (10% waste, quarter-yard rounded) or ${fmt(result.bags80)} × 80-lb bags.`
    : "";

  return (
    <div>
      <Seg<Shape>
        ariaLabel="What are you pouring"
        value={shape}
        onChange={setShape}
        options={[
          { value: "slab", label: "Slab" },
          { value: "footing", label: "Footing" },
          { value: "column", label: "Round column" },
          { value: "stairs", label: "Stairs" },
        ]}
      />
      {shape === "slab" ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Length" hint="Drag, or type an exact figure.">
            <SliderInput value={length} onChange={setLength} min={1} max={60} step={0.5} suffix="ft" ariaLabel="Length in feet" />
          </Field>
          <Field label="Width">
            <SliderInput value={width} onChange={setWidth} min={1} max={60} step={0.5} suffix="ft" ariaLabel="Width in feet" />
          </Field>
          <Field label="Thickness" hint="4 in for patios and walkways, 6 in for driveways, 8 in for heavy loads.">
            <SliderInput value={thick} onChange={setThick} min={2} max={12} step={0.5} suffix="in" ariaLabel="Thickness in inches" />
          </Field>
        </div>
      ) : shape === "footing" ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Total length" hint="Add up every run of footing — the full perimeter for a foundation.">
            <SliderInput value={q.fl} onChange={set("fl")} min={1} max={300} step={1} suffix="ft" ariaLabel="Footing length in feet" />
          </Field>
          <Field label="Width" hint="Typically 2× the wall thickness; 16 in under an 8-in wall.">
            <SliderInput value={q.fw} onChange={set("fw")} min={8} max={48} step={1} suffix="in" ariaLabel="Footing width in inches" />
          </Field>
          <Field label="Depth (thickness)" hint="8 in is common for residential; check your soil and local code.">
            <SliderInput value={q.fd} onChange={set("fd")} min={6} max={36} step={1} suffix="in" ariaLabel="Footing depth in inches" />
          </Field>
        </div>
      ) : shape === "column" ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Diameter" hint="Sonotube size: 8, 10, 12 in are the common deck and porch piers.">
            <SliderInput value={q.cd} onChange={set("cd")} min={6} max={36} step={1} suffix="in" ariaLabel="Column diameter in inches" />
          </Field>
          <Field label="Height" hint="Below and above grade — the full tube length you'll fill.">
            <SliderInput value={q.ch} onChange={set("ch")} min={1} max={12} step={0.5} suffix="ft" ariaLabel="Column height in feet" />
          </Field>
          <Field label="How many">
            <SliderInput value={q.cn} onChange={set("cn")} min={1} max={30} step={1} ariaLabel="Number of columns" />
          </Field>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Field label="Stair width" hint="Side to side.">
            <SliderInput value={q.sw} onChange={set("sw")} min={2} max={12} step={0.5} suffix="ft" ariaLabel="Stair width in feet" />
          </Field>
          <Field label="Number of steps" hint="Count the risers.">
            <SliderInput value={q.sn} onChange={set("sn")} min={1} max={12} step={1} ariaLabel="Number of steps" />
          </Field>
          <Field label="Rise per step" hint="7 in is the comfortable standard; most codes cap it at 7-3/4 in.">
            <SliderInput value={q.sr} onChange={set("sr")} min={4} max={8} step={0.25} suffix="in" ariaLabel="Rise per step in inches" />
          </Field>
          <Field label="Run (tread depth)" hint="11 in is standard; codes require at least 10 in.">
            <SliderInput value={q.srun} onChange={set("srun")} min={9} max={16} step={0.5} suffix="in" ariaLabel="Run per step in inches" />
          </Field>
          <p className="text-xs leading-relaxed text-bone-500 lg:col-span-2">
            Figures the steps as solid concrete. If you fill the core with compacted gravel or rubble, order less.
          </p>
        </div>
      )}

      {result ? (
        <div className="mt-2">
          {result.shape === "slab" ? (
            <SlabScene l={result.dims.l} w={result.dims.w} tIn={result.dims.t} />
          ) : result.shape === "footing" ? (
            <FootingScene l={result.dims.l} wIn={result.dims.w} dIn={result.dims.d} />
          ) : result.shape === "column" ? (
            <ColumnScene dIn={result.dims.d} h={result.dims.h} count={result.dims.n} />
          ) : (
            <StairsScene wFt={result.dims.w} n={result.dims.n} riseIn={result.dims.r} runIn={result.dims.run} />
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Stat
              label="Order this much ready-mix"
              value={`${fmt(result.order)} yd³`}
              sub={`${fmt(result.cuyd)} yd³ exact + 10% waste = ${fmt(result.exactWithWaste)}, rounded up to the quarter yard plants sell in`}
              highlight={!result.bagJob}
            />
            <Stat
              label="Or by the bag (80 lb)"
              value={`${fmt(result.bags80)} bags`}
              sub={
                result.bagJob
                  ? "Under a yard — bags beat a short-load fee on a truck"
                  : "Each 80-lb bag ≈ 0.6 ft³ · 5% waste · over a yard, a truck is usually cheaper"
              }
              highlight={result.bagJob}
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Stat label="60-lb bags" value={`${fmt(result.bags60)} bags`} sub="Each ≈ 0.45 ft³" />
            <Stat label="40-lb bags" value={`${fmt(result.bags40)} bags`} sub="Each ≈ 0.30 ft³" />
          </div>
          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter dimensions to get your order.</p>
      )}
    </div>
  );
}
