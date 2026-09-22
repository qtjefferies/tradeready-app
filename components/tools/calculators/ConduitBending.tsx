"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { Field, Seg, SliderInput, Stat, StepSlider, fmt, toFraction } from "../ui";
import { DIM, INK, IsoBox, IsoStage, SAFETY, boxCorners, fitIso, type V3 } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Mode = "offset" | "stub" | "saddle3" | "saddle4";
type Angle = "10" | "15" | "22.5" | "30" | "45";
type SaddleAngle = "22.5" | "30" | "45";
type Size = "1/2" | "3/4" | "1" | "1-1/4";

/** Offset multipliers as printed on a hand bender — cosecant of the angle, rounded. */
const MULTIPLIER: Record<Angle, number> = { "10": 6.0, "15": 3.9, "22.5": 2.6, "30": 2.0, "45": 1.4 };
/** Shrink per inch of offset depth. */
const SHRINK_PER_IN: Record<Angle, number> = {
  "10": 1 / 16,
  "15": 1 / 8,
  "22.5": 3 / 16,
  "30": 1 / 4,
  "45": 3 / 8,
};
/** 90° take-up for EMT on a standard hand bender, inches. */
const TAKE_UP: Record<Size, number> = { "1/2": 5, "3/4": 6, "1": 8, "1-1/4": 11 };
/** Outside diameter of EMT, inches — sets how fat the conduit draws. */
const OD: Record<Size, number> = { "1/2": 0.706, "3/4": 0.922, "1": 1.163, "1-1/4": 1.51 };
const ANGLES: Angle[] = ["10", "15", "22.5", "30", "45"];
const SOURCE = "Conduit bending calculator";
const HREF = "/tools/electrical/conduit-bending-calculator";
/** Clearance added each side of the obstruction on a four-point saddle. */
const SADDLE_CLEAR = 1;
/** Three-point saddle: shrink per inch of obstruction height, and mark spacing. */
const SADDLE3_SHRINK = 3 / 16;
const SADDLE3_SPACING = 2.5;

const rad = (deg: number) => (deg * Math.PI) / 180;

/* ------------------------------------------------------------------ */
/* Scene description + renderer                                        */
/* ------------------------------------------------------------------ */

type Mark = { at: V3; label: string; sub?: string; labelAt: V3; anchor?: "start" | "middle" | "end" };
type Dim = { a: V3; b: V3; text: string; textAt: V3; anchor?: "start" | "middle" | "end" };
type Obstruction = { x: number; dx: number; dz: number };
type Scene = {
  /** Conduit centreline, inches. x runs along the conduit, z is up, y = 0. */
  path: V3[];
  od: number;
  marks: Mark[];
  dims: Dim[];
  obstruction?: Obstruction;
  caption: string;
  aria: string;
};

/**
 * The bent conduit in 3D. Every point that gets drawn — the path, the
 * obstruction, label anchors, dimension lines — goes into the fit, so the
 * pane holds a 1/2-inch offset and a 5-foot stub equally well.
 */
function ConduitScene({ scene }: { scene: Scene }) {
  const W = 480;
  const H = 250;
  const { path, od, marks, dims, obstruction } = scene;
  const xs = path.map((p) => p[0]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = Math.max(maxX - minX, 1);
  const fy = Math.max(od * 3, span * 0.08);
  const floorM = span * 0.06;
  const floor: V3[] = [
    [minX - floorM, -fy, 0],
    [maxX + floorM, -fy, 0],
    [maxX + floorM, fy, 0],
    [minX - floorM, fy, 0],
  ];
  const corners: V3[] = [
    ...path,
    ...floor,
    ...marks.map((m) => m.labelAt),
    ...dims.flatMap((d) => [d.a, d.b, d.textAt]),
    ...(obstruction ? boxCorners(obstruction.x, -fy * 0.8, 0, obstruction.dx, fy * 1.6, obstruction.dz) : []),
  ];
  // Text has pixel width the world-space fit can't see. Estimate each
  // label's footprint from the current scale, add it as corners, refit; two
  // or three rounds is enough for the scale to settle.
  const labels = [
    ...marks.map((m) => ({ at: m.labelAt, anchor: m.anchor ?? "middle", chars: Math.max(m.label.length, m.sub?.length ?? 0), up: 11, down: m.sub ? 28 : 4 })),
    ...dims.map((d) => ({ at: d.textAt, anchor: d.anchor ?? "middle", chars: d.text.length, up: 8, down: 8 })),
  ];
  const C = Math.cos(Math.PI / 6);
  let pr = fitIso(corners, W, H, 26);
  for (let i = 0; i < 3; i++) {
    const kk = pr.k;
    const extra: V3[] = labels.flatMap((l) => {
      const [x, y, z] = l.at;
      const w = l.chars * 7; // px, bold 11–12px
      const dy = w / (C * kk); // world y that moves a point w px sideways on screen
      const right: V3 = [x, y - (l.anchor === "middle" ? dy / 2 : dy), z];
      const left: V3 = [x, y + (l.anchor === "middle" ? dy / 2 : dy), z];
      const top: V3 = [x, y, z + l.up / kk];
      const bottom: V3 = [x, y, z - l.down / kk];
      return l.anchor === "start" ? [right, top, bottom] : l.anchor === "end" ? [left, top, bottom] : [right, left, top, bottom];
    });
    pr = fitIso([...corners, ...extra], W, H, 26);
  }
  const { P, pts, k } = pr;
  const sw = Math.max(od * k, 5);
  const tick = od * 1.6;

  return (
    <IsoStage W={W} H={H} label={scene.aria}>
      <polygon points={pts(...floor)} fill="#0f1116" />
      {obstruction ? (
        <IsoBox
          pr={pr}
          x={obstruction.x}
          y={-fy * 0.8}
          z={0}
          dx={obstruction.dx}
          dy={fy * 1.6}
          dz={obstruction.dz}
          top={INK.top}
          right={INK.right}
          left={INK.left}
        />
      ) : null}
      {/* conduit: shadow, body, highlight */}
      <polyline points={pts(...path)} fill="none" stroke="#6b4f14" strokeWidth={sw + 2} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={pts(...path)} fill="none" stroke={SAFETY} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      <polyline
        points={pts(...path)}
        fill="none"
        stroke="#ffe08a"
        strokeWidth={Math.max(sw * 0.25, 1.2)}
        strokeLinejoin="round"
        strokeLinecap="round"
        transform={`translate(0 ${-sw * 0.28})`}
        opacity={0.8}
      />
      {/* dimensions */}
      {dims.map((d, i) => {
        const a = P(...d.a);
        const b = P(...d.b);
        const t = P(...d.textAt);
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={DIM} strokeWidth={1.5} />
            <circle cx={a.x} cy={a.y} r={2.2} fill={DIM} />
            <circle cx={b.x} cy={b.y} r={2.2} fill={DIM} />
            <text x={t.x} y={t.y + 4} fill={DIM} fontSize={12} fontWeight={700} textAnchor={d.anchor ?? "middle"}>
              {d.text}
            </text>
          </g>
        );
      })}
      {/* marks */}
      {marks.map((m, i) => {
        const [x, , z] = m.at;
        const a = P(x, -tick, z);
        const b = P(x, tick, z);
        const t = P(...m.labelAt);
        const anchor = m.anchor ?? "middle";
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
            <text x={t.x} y={t.y} fill="#fff" fontSize={11} fontWeight={800} textAnchor={anchor}>
              {m.label}
            </text>
            {m.sub ? (
              <text x={t.x} y={t.y + 14} fill={SAFETY} fontSize={12} fontWeight={800} textAnchor={anchor}>
                {m.sub}
              </text>
            ) : null}
          </g>
        );
      })}
      <text x={12} y={H - 10} fill={DIM} fontSize={11} fontWeight={700} textAnchor="start">
        {scene.caption}
      </text>
    </IsoStage>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="mt-4 rounded-xl border border-ink-600 bg-ink-900 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-500">{title}</p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-bone-200">
            <span className="font-display text-sm text-safety-300">{i + 1}.</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">{children}</p>
  );
}

const ANGLE_OPTIONS = ANGLES.map((a) => ({ value: a, label: `${a}°` }));
const SIZE_OPTIONS: { value: Size; label: string }[] = [
  { value: "1/2", label: '1/2"' },
  { value: "3/4", label: '3/4"' },
  { value: "1", label: '1"' },
  { value: "1-1/4", label: '1-1/4"' },
];

function num(s: string): number {
  const n = parseFloat(s);
  return isFinite(n) ? n : NaN;
}

/* ------------------------------------------------------------------ */
/* Calculator                                                           */
/* ------------------------------------------------------------------ */

export default function ConduitBending() {
  const [q, set] = useUrlState({
    mode: "offset",
    d: "6", // offset depth
    a: "30", // offset angle
    h: "12", // stub height
    sz: "1/2", // conduit size
    b2b: "0", // back-to-back on/off
    bb: "24", // back-to-back distance
    oh: "3", // obstruction height (saddles)
    ox: "24", // distance from conduit end to obstruction (near edge / centre)
    ow: "6", // obstruction width (4-point)
    sa: "30", // 4-point angle
  });
  const mode = (["offset", "stub", "saddle3", "saddle4"].includes(q.mode) ? q.mode : "offset") as Mode;
  const angle = (ANGLES.includes(q.a as Angle) ? q.a : "30") as Angle;
  const size = (q.sz in TAKE_UP ? q.sz : "1/2") as Size;
  const saddleAngle = (["22.5", "30", "45"].includes(q.sa) ? q.sa : "30") as SaddleAngle;
  const b2bOn = q.b2b === "1";
  const setMode = set("mode") as (v: Mode) => void;
  const setAngle = set("a") as (v: Angle) => void;
  const setSize = set("sz") as (v: Size) => void;
  const setSaddleAngle = set("sa") as (v: SaddleAngle) => void;
  const setB2b = set("b2b") as (v: "0" | "1") => void;

  const od = OD[size];

  /* ---------- Offset ---------- */
  const offset = useMemo(() => {
    const d = num(q.d);
    if (!(d > 0)) return null;
    const mult = MULTIPLIER[angle];
    const travel = d * mult;
    const shrink = d * SHRINK_PER_IN[angle];
    const th = rad(parseFloat(angle));
    const hx = travel * Math.cos(th);
    const lead = Math.max(travel * 0.75, 6);
    const tail = lead;
    const total = lead + hx + tail;
    const lift = Math.max(total * 0.12, 1.5);
    const off = Math.max(od * 3, total * 0.08) * 1.5;
    const rows = ANGLES.map((a) => ({ a, mult: MULTIPLIER[a], travel: d * MULTIPLIER[a], shrink: d * SHRINK_PER_IN[a] }));
    const scene: Scene = {
      od,
      path: [
        [0, 0, 0],
        [lead, 0, 0],
        [lead + hx, 0, d],
        [total, 0, d],
      ],
      marks: [
        { at: [lead, 0, 0], label: "MARK 1", sub: "start of offset", labelAt: [lead, 0, lift] },
        { at: [lead + hx, 0, d], label: "MARK 2", sub: `${toFraction(travel)} from mark 1`, labelAt: [lead + hx, 0, d + lift] },
      ],
      dims: [
        { a: [lead, off, 0], b: [lead + hx, off, d], text: `${toFraction(travel)} between marks`, textAt: [lead + hx * 0.5, off * 2.2, d * 0.5] },
        { a: [total - tail * 0.4, -off, 0], b: [total - tail * 0.4, -off, d], text: `${toFraction(d)} offset`, textAt: [total - tail * 0.4, -off * 1.6, d * 0.5], anchor: "start" },
      ],
      caption: `${angle}° offset · multiplier ${mult.toFixed(1)} · shrink ${toFraction(shrink)}`,
      aria: `${toFraction(d)} offset at ${angle} degrees, marks ${toFraction(travel)} apart`,
    };
    return { d, mult, travel, shrink, rows, scene };
  }, [q.d, angle, od]);

  /* ---------- 90° stub-up (+ optional back-to-back) ---------- */
  const stub = useMemo(() => {
    const h = num(q.h);
    if (!(h > 0)) return null;
    const takeUp = TAKE_UP[size];
    const mark = h - takeUp;
    if (mark <= 0) return { h, takeUp, mark, tooShort: true as const };
    const bb = num(q.bb);
    const b2b = b2bOn && bb > takeUp ? { bb, mark2: bb - takeUp } : null;
    const flat = b2b ? b2b.bb : Math.max(h * 0.7, 8);
    const lift = Math.max((flat + h) * 0.1, 1.5);
    const off = Math.max(od * 3, flat * 0.08) * 1.5;
    const path: V3[] = b2b
      ? [
          [0, 0, h],
          [0, 0, 0],
          [flat, 0, 0],
          [flat, 0, h],
        ]
      : [
          [0, 0, 0],
          [flat, 0, 0],
          [flat, 0, h],
        ];
    const marks: Mark[] = b2b
      ? [
          { at: [0, 0, takeUp], label: "MARK 1", sub: `${toFraction(mark)} from end`, labelAt: [0, off * 1.4, takeUp], anchor: "end" },
          { at: [flat - takeUp, 0, 0], label: "MARK 2", sub: `${toFraction(b2b.mark2)} from back of 1st 90`, labelAt: [flat - takeUp, 0, lift], anchor: "middle" },
        ]
      : [{ at: [flat, 0, takeUp], label: "MARK", sub: `${toFraction(mark)} from end`, labelAt: [flat, off * 1.4, takeUp], anchor: "end" }];
    const dims: Dim[] = [
      { a: [flat, -off, 0], b: [flat, -off, h], text: `${toFraction(h)} stub`, textAt: [flat, -off * 1.6, h * 0.55], anchor: "start" },
      { a: [flat, -off * 0.5, 0], b: [flat, -off * 0.5, takeUp], text: `take-up ${toFraction(takeUp)}`, textAt: [flat, -off * 1.6, takeUp * 0.5 - lift * 0.35], anchor: "start" },
    ];
    if (b2b) dims.push({ a: [0, off, -lift * 0.4], b: [flat, off, -lift * 0.4], text: `${toFraction(b2b.bb)} back to back`, textAt: [flat * 0.5, off * 2, -lift * 0.4] });
    const scene: Scene = {
      od,
      path,
      marks,
      dims,
      caption: `${size}" EMT · take-up ${toFraction(takeUp)}${b2b ? " · back-to-back 90s" : ""}`,
      aria: `${toFraction(h)} 90 degree stub in ${size} inch EMT, mark at ${toFraction(mark)}`,
    };
    return { h, takeUp, mark, b2b, scene, tooShort: false as const };
  }, [q.h, q.bb, b2bOn, size, od]);

  /* ---------- Three-point saddle ---------- */
  const saddle3 = useMemo(() => {
    const h = num(q.oh);
    const D = num(q.ox);
    if (!(h > 0) || !(D > 0)) return null;
    const shrink = h * SADDLE3_SHRINK;
    const spacing = h * SADDLE3_SPACING;
    const center = D + shrink; // on the tape, before bending
    const outer1 = center - spacing;
    const outer2 = center + spacing;
    if (outer1 <= 0) return { h, D, shrink, spacing, center, outer1, outer2, tooClose: true as const };
    // After bending: outer bends land hx either side of the obstruction centre.
    const hx = spacing * Math.cos(rad(22.5));
    const apex = h + od;
    const lead = D - hx;
    const tail = Math.max(hx * 0.6, 4);
    const total = D + hx + tail;
    const lift = Math.max(total * 0.1, 1.5);
    const scene: Scene = {
      od,
      path: [
        [0, 0, 0],
        [lead, 0, 0],
        [D, 0, apex],
        [D + hx, 0, 0],
        [total, 0, 0],
      ],
      marks: [
        { at: [lead, 0, 0], label: "MARK 1 · 22.5°", sub: `${toFraction(outer1)} from end`, labelAt: [lead, 0, lift] },
        { at: [D, 0, apex], label: "CENTER · 45°", sub: `${toFraction(center)} from end`, labelAt: [D, 0, apex + lift] },
        { at: [D + hx, 0, 0], label: "MARK 3 · 22.5°", sub: `${toFraction(outer2)} from end`, labelAt: [D + hx, 0, lift] },
      ],
      dims: [],
      obstruction: { x: D - h * 0.45, dx: h * 0.9, dz: h },
      caption: `Three-point saddle over ${toFraction(h)} · shrink ${toFraction(shrink)} · marks ${toFraction(spacing)} apart`,
      aria: `Three-point saddle over a ${toFraction(h)} obstruction`,
    };
    return { h, D, shrink, spacing, center, outer1, outer2, scene, tooClose: false as const };
  }, [q.oh, q.ox, od]);

  /* ---------- Four-point saddle ---------- */
  const saddle4 = useMemo(() => {
    const h = num(q.oh);
    const w = num(q.ow);
    const D = num(q.ox);
    if (!(h > 0) || !(w > 0) || !(D > 0)) return null;
    const mult = MULTIPLIER[saddleAngle];
    const travel = h * mult;
    const shrink1 = h * SHRINK_PER_IN[saddleAngle];
    const shrink = shrink1 * 2;
    const top = w + SADDLE_CLEAR * 2;
    // Tape marks, before bending. Mark 2 is pushed forward by the first
    // offset's shrink so the flat lands where it should.
    const m2 = D - SADDLE_CLEAR + shrink1;
    const m1 = m2 - travel;
    const m3 = m2 + top;
    const m4 = m3 + travel;
    if (m1 <= 0) return { h, w, D, mult, travel, shrink, top, m1, m2, m3, m4, tooClose: true as const };
    const hx = travel * Math.cos(rad(parseFloat(saddleAngle)));
    const apex = h + od;
    const x2 = D - SADDLE_CLEAR;
    const x1 = x2 - hx;
    const x3 = x2 + top;
    const x4 = x3 + hx;
    const tail = Math.max(hx * 0.6, 4);
    const total = x4 + tail;
    const lift = Math.max(total * 0.1, 1.5);
    const scene: Scene = {
      od,
      path: [
        [0, 0, 0],
        [x1, 0, 0],
        [x2, 0, apex],
        [x3, 0, apex],
        [x4, 0, 0],
        [total, 0, 0],
      ],
      marks: [
        { at: [x1, 0, 0], label: "MARK 1", sub: toFraction(m1), labelAt: [x1, 0, lift] },
        { at: [x2, 0, apex], label: "MARK 2", sub: toFraction(m2), labelAt: [x2, 0, apex + lift] },
        { at: [x3, 0, apex], label: "MARK 3", sub: toFraction(m3), labelAt: [x3, 0, apex + lift] },
        { at: [x4, 0, 0], label: "MARK 4", sub: toFraction(m4), labelAt: [x4, 0, lift] },
      ],
      dims: [],
      obstruction: { x: D, dx: w, dz: h },
      caption: `Four-point saddle · ${saddleAngle}° × 4 · ${toFraction(travel)} between outer and inner marks · shrink ${toFraction(shrink)}`,
      aria: `Four-point saddle over a ${toFraction(w)} wide, ${toFraction(h)} tall obstruction`,
    };
    return { h, w, D, mult, travel, shrink, top, m1, m2, m3, m4, scene, tooClose: false as const };
  }, [q.oh, q.ow, q.ox, saddleAngle, od]);

  /* ---------- Result text + quote payload ---------- */
  const labor = (what: string) => [{ description: `${what} — conduit bending and installation labor`, qty: 1, unit_price: 0, kind: "labor" as const }];

  const resultText = (() => {
    if (mode === "offset" && offset)
      return `Conduit offset: ${toFraction(offset.d)} at ${angle}° → marks ${toFraction(offset.travel)} apart (multiplier ${offset.mult.toFixed(1)}), shrink ${toFraction(offset.shrink)}.`;
    if (mode === "stub" && stub && !stub.tooShort)
      return (
        `90° stub ${toFraction(stub.h)} in ${size}" EMT → mark at ${toFraction(stub.mark)} from the end (take-up ${toFraction(stub.takeUp)}).` +
        (stub.b2b ? ` Back-to-back ${toFraction(stub.b2b.bb)} → second mark ${toFraction(stub.b2b.mark2)} from the back of the first 90.` : "")
      );
    if (mode === "saddle3" && saddle3 && !saddle3.tooClose)
      return `Three-point saddle over ${toFraction(saddle3.h)}: marks at ${toFraction(saddle3.outer1)}, ${toFraction(saddle3.center)} (center, 45°), ${toFraction(saddle3.outer2)} from the end; outer bends 22.5°; shrink ${toFraction(saddle3.shrink)}.`;
    if (mode === "saddle4" && saddle4 && !saddle4.tooClose)
      return `Four-point saddle over ${toFraction(saddle4.w)} × ${toFraction(saddle4.h)} at ${saddleAngle}°: marks at ${toFraction(saddle4.m1)}, ${toFraction(saddle4.m2)}, ${toFraction(saddle4.m3)}, ${toFraction(saddle4.m4)} from the end; shrink ${toFraction(saddle4.shrink)}.`;
    return "";
  })();

  const buildPayload = (): ToolQuotePayload | null => {
    if (!resultText) return null;
    if (mode === "offset" && offset) {
      return {
        source: SOURCE,
        sourceHref: HREF,
        title: `Conduit run — ${toFraction(offset.d)} offset`,
        notes:
          `${toFraction(offset.d)} offset at ${angle}° (multiplier ${offset.mult.toFixed(1)}).\n` +
          `Mark 1 where the offset starts, mark 2 ${toFraction(offset.travel)} further along. Bend ${angle}° at each mark, opposite directions.\n` +
          `Allow ${toFraction(offset.shrink)} of shrink in the run.`,
        lines: labor("Conduit offset"),
      };
    }
    if (mode === "stub" && stub && !stub.tooShort) {
      return {
        source: SOURCE,
        sourceHref: HREF,
        title: `Conduit stub-up — ${toFraction(stub.h)}`,
        notes:
          `90° stub ${toFraction(stub.h)} in ${size}" EMT. Mark at ${toFraction(stub.mark)} from the end (take-up ${toFraction(stub.takeUp)} deducted), arrow on the mark, pull to 90°.` +
          (stub.b2b
            ? `\nBack-to-back 90 at ${toFraction(stub.b2b.bb)}: mark ${toFraction(stub.b2b.mark2)} from the back of the first bend, arrow on the mark, hook toward the free end.`
            : ""),
        lines: labor(stub.b2b ? "Back-to-back 90° stubs" : "Conduit 90° stub-up"),
      };
    }
    if (mode === "saddle3" && saddle3 && !saddle3.tooClose) {
      return {
        source: SOURCE,
        sourceHref: HREF,
        title: `Conduit saddle — over ${toFraction(saddle3.h)}`,
        notes:
          `Three-point saddle over a ${toFraction(saddle3.h)} obstruction, ${toFraction(saddle3.D)} from the end.\n` +
          `Center mark ${toFraction(saddle3.center)} (45°), outer marks ${toFraction(saddle3.outer1)} and ${toFraction(saddle3.outer2)} (22.5°). Shrink ${toFraction(saddle3.shrink)}.`,
        lines: labor("Three-point saddle"),
      };
    }
    if (mode === "saddle4" && saddle4 && !saddle4.tooClose) {
      return {
        source: SOURCE,
        sourceHref: HREF,
        title: `Conduit saddle — over ${toFraction(saddle4.w)} × ${toFraction(saddle4.h)}`,
        notes:
          `Four-point saddle at ${saddleAngle}° over a ${toFraction(saddle4.w)} wide, ${toFraction(saddle4.h)} tall obstruction.\n` +
          `Marks from the end: ${toFraction(saddle4.m1)}, ${toFraction(saddle4.m2)}, ${toFraction(saddle4.m3)}, ${toFraction(saddle4.m4)}. Shrink ${toFraction(saddle4.shrink)}.`,
        lines: labor("Four-point saddle"),
      };
    }
    return null;
  };

  /* ---------- UI ---------- */
  return (
    <div>
      <Seg<Mode>
        ariaLabel="Bend type"
        value={mode}
        onChange={setMode}
        options={[
          { value: "offset", label: "Offset" },
          { value: "stub", label: "90° stub-up" },
          { value: "saddle3", label: "3-point saddle" },
          { value: "saddle4", label: "4-point saddle" },
        ]}
      />

      {mode === "offset" ? (
        <div className="mt-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Offset depth" hint="How far the conduit has to jog — the beam, box, or wall it has to clear.">
              <SliderInput value={q.d} onChange={set("d")} min={0.5} max={24} step={0.25} suffix="in" ariaLabel="Offset depth in inches" />
            </Field>
            <Field label="Bend angle" hint="30° is the workhorse: multiplier 2, easy math, moderate shrink.">
              <StepSlider<Angle> ariaLabel="Bend angle" value={angle} onChange={setAngle} options={ANGLE_OPTIONS} />
            </Field>
          </div>

          {offset ? (
            <>
              <ConduitScene scene={offset.scene} />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Distance between marks"
                  value={toFraction(offset.travel)}
                  sub={`${toFraction(offset.d)} × ${offset.mult.toFixed(1)} = ${fmt(offset.travel, 2)} in`}
                  highlight
                />
                <Stat label="Shrink" value={toFraction(offset.shrink)} sub="The run gets this much shorter — add it to your measurement before you cut." />
                <Stat label="Bends" value={`${angle}° × 2`} sub="Same angle at each mark, opposite directions, in the same plane." />
              </div>
              <Steps
                title="How to bend it"
                steps={[
                  `Measure to where the offset needs to start and make mark 1. If the far side has to land somewhere exact, add the ${toFraction(offset.shrink)} shrink to that measurement.`,
                  `Measure ${toFraction(offset.travel)} from mark 1 and make mark 2.`,
                  `Arrow on mark 1, bend to ${angle}°. Slide the bender to mark 2, spin the conduit 180°, line up the arrow, bend to ${angle}° — sight both bends so they sit in one plane, no dogleg.`,
                ]}
              />
              <div className="mt-6 overflow-hidden rounded-xl border border-ink-600">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-ink-900 text-left text-[11px] uppercase tracking-[0.12em] text-bone-500">
                      <th className="px-4 py-3 font-bold">Angle</th>
                      <th className="px-4 py-3 font-bold">Multiplier</th>
                      <th className="px-4 py-3 font-bold">Between marks</th>
                      <th className="px-4 py-3 text-right font-bold">Shrink</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offset.rows.map((r) => {
                      const active = r.a === angle;
                      return (
                        <tr
                          key={r.a}
                          onClick={() => setAngle(r.a)}
                          className={`cursor-pointer border-t border-ink-700 transition hover:bg-ink-800 ${active ? "bg-safety-500/10" : ""}`}
                        >
                          <td className="px-4 py-2.5 font-bold text-paper">
                            {r.a}°{active ? <span className="ml-2 text-xs font-bold text-safety-300">← selected</span> : null}
                          </td>
                          <td className="px-4 py-2.5 text-bone-300">{r.mult.toFixed(1)}</td>
                          <td className="px-4 py-2.5 font-bold text-paper">{toFraction(r.travel)}</td>
                          <td className="px-4 py-2.5 text-right text-bone-300">{toFraction(r.shrink)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-bone-500">
                Shallow angles need more room but shrink less; 45° fits a tight spot but eats {toFraction(offset.d * SHRINK_PER_IN["45"])} of run. Tap a row to switch.
              </p>
              <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
            </>
          ) : (
            <p className="mt-6 text-sm text-bone-500">Enter an offset depth to get your marks.</p>
          )}
        </div>
      ) : null}

      {mode === "stub" ? (
        <div className="mt-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Stub height" hint="Finished height, floor (or back of the run) to the end of the stub.">
              <SliderInput value={q.h} onChange={set("h")} min={6} max={60} step={0.25} suffix="in" ariaLabel="Stub height in inches" />
            </Field>
            <Field label="Conduit size (EMT)" hint={`Take-up for the bender radius: ${SIZE_OPTIONS.map((s) => `${s.label} = ${TAKE_UP[s.value]}"`).join(", ")}.`}>
              <StepSlider<Size> ariaLabel="Conduit size" value={size} onChange={setSize} options={SIZE_OPTIONS} />
            </Field>
            <Field label="Second 90" hint="Back-to-back: a second stub measured from the back of the first bend.">
              <Seg<"0" | "1">
                ariaLabel="Back-to-back"
                value={b2bOn ? "1" : "0"}
                onChange={setB2b}
                options={[
                  { value: "0", label: "Single stub" },
                  { value: "1", label: "Back-to-back 90s" },
                ]}
              />
            </Field>
            {b2bOn ? (
              <Field label="Back-to-back distance" hint="Outside of the first 90 to outside of the second.">
                <SliderInput value={q.bb} onChange={set("bb")} min={6} max={120} step={0.25} suffix="in" ariaLabel="Back-to-back distance in inches" />
              </Field>
            ) : null}
          </div>

          {stub && !stub.tooShort ? (
            <>
              <ConduitScene scene={stub.scene} />
              {b2bOn && !stub.b2b ? (
                <Warn>
                  The back-to-back distance has to be more than the {toFraction(stub.takeUp)} take-up for {size}&quot; EMT. Showing the single stub.
                </Warn>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Mark from the end" value={toFraction(stub.mark)} sub={`${toFraction(stub.h)} − ${toFraction(stub.takeUp)} take-up`} highlight />
                <Stat label="Take-up deducted" value={toFraction(stub.takeUp)} sub={`Standard hand bender, ${size}" EMT. Use your bender's number if it lists one.`} />
                {stub.b2b ? (
                  <Stat label="Second mark" value={toFraction(stub.b2b.mark2)} sub={`${toFraction(stub.b2b.bb)} − ${toFraction(stub.takeUp)}, from the back of the first 90`} highlight />
                ) : (
                  <Stat label="Bend" value="Arrow on mark" sub="Hook toward the free end, foot pressure on the heel, pull to 90°." />
                )}
              </div>
              <Steps
                title="How to bend it"
                steps={[
                  `Measure ${toFraction(stub.mark)} from the end of the conduit and mark it.`,
                  "Arrow on the mark, hook toward the short end. Keep your foot on the bender heel and pull to 90° — check it with a level.",
                  ...(stub.b2b
                    ? [
                        `Measure ${toFraction(stub.b2b.mark2)} from the back of the first 90 and mark it.`,
                        "Arrow on that mark, hook toward the free end, bend to 90° in the same plane. The outside of the second bend lands " + toFraction(stub.b2b.bb) + " from the outside of the first.",
                      ]
                    : []),
                ]}
              />
              <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
            </>
          ) : (
            <p className="mt-6 text-sm text-bone-500">
              {stub ? `A ${toFraction(stub.h)} stub is shorter than the ${toFraction(stub.takeUp)} take-up for ${size}" EMT — it can't be bent this way.` : "Enter a stub height to get your mark."}
            </p>
          )}
        </div>
      ) : null}

      {mode === "saddle3" ? (
        <div className="mt-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Obstruction height" hint="A pipe or conduit crossing your run. Three-point works for round, narrow obstructions.">
              <SliderInput value={q.oh} onChange={set("oh")} min={0.5} max={12} step={0.25} suffix="in" ariaLabel="Obstruction height in inches" />
            </Field>
            <Field label="Center of obstruction from the end" hint="Measured along the conduit from the end you're working from.">
              <SliderInput value={q.ox} onChange={set("ox")} min={6} max={120} step={0.25} suffix="in" ariaLabel="Distance to obstruction center in inches" />
            </Field>
          </div>

          {saddle3 && !saddle3.tooClose ? (
            <>
              <ConduitScene scene={saddle3.scene} />
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Stat label="Center mark (45°)" value={toFraction(saddle3.center)} sub={`${toFraction(saddle3.D)} + ${toFraction(saddle3.shrink)} shrink, from the end`} highlight />
                <Stat label="Outer marks (22.5°)" value={`± ${toFraction(saddle3.spacing)}`} sub={`${toFraction(saddle3.outer1)} and ${toFraction(saddle3.outer2)} from the end`} />
                <Stat label="Shrink" value={toFraction(saddle3.shrink)} sub={`3/16" per inch of obstruction height`} />
              </div>
              <Steps
                title="How to bend it"
                steps={[
                  `Measure ${toFraction(saddle3.center)} from the end (obstruction center plus ${toFraction(saddle3.shrink)} shrink) and make the center mark.`,
                  `Measure ${toFraction(saddle3.spacing)} each side of it for the two outer marks — ${toFraction(saddle3.outer1)} and ${toFraction(saddle3.outer2)} from the end.`,
                  "Center mark on the bender's saddle notch (the rim mark), bend to 45°.",
                  "Flip the conduit, arrow on the first outer mark, bend 22.5° back the other way. Same again at the other outer mark. Sight it flat.",
                ]}
              />
              <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
            </>
          ) : saddle3 ? (
            <Warn>
              The obstruction is too close to the end: the first outer mark would fall {toFraction(-saddle3.outer1)} past the end of the conduit. Move it out to at least{" "}
              {toFraction(saddle3.spacing - saddle3.shrink)} or use a longer stick.
            </Warn>
          ) : (
            <p className="mt-6 text-sm text-bone-500">Enter the obstruction height to get your marks.</p>
          )}
        </div>
      ) : null}

      {mode === "saddle4" ? (
        <div className="mt-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <Field label="Obstruction height" hint="How high the conduit has to lift to clear it.">
              <SliderInput value={q.oh} onChange={set("oh")} min={0.5} max={12} step={0.25} suffix="in" ariaLabel="Obstruction height in inches" />
            </Field>
            <Field label="Obstruction width" hint={`Along the run. The flat on top gets ${toFraction(SADDLE_CLEAR)} of clearance each side.`}>
              <SliderInput value={q.ow} onChange={set("ow")} min={1} max={48} step={0.25} suffix="in" ariaLabel="Obstruction width in inches" />
            </Field>
            <Field label="Near edge of obstruction from the end" hint="Measured along the conduit from the end you're working from.">
              <SliderInput value={q.ox} onChange={set("ox")} min={6} max={120} step={0.25} suffix="in" ariaLabel="Distance to obstruction near edge in inches" />
            </Field>
            <Field label="Bend angle" hint="Two opposing offsets at this angle. 22.5° is the usual pick for saddles — less shrink, easier to keep flat.">
              <StepSlider<SaddleAngle>
                ariaLabel="Saddle bend angle"
                value={saddleAngle}
                onChange={setSaddleAngle}
                options={[
                  { value: "22.5", label: "22.5°" },
                  { value: "30", label: "30°" },
                  { value: "45", label: "45°" },
                ]}
              />
            </Field>
          </div>

          {saddle4 && !saddle4.tooClose ? (
            <>
              <ConduitScene scene={saddle4.scene} />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Mark 1" value={toFraction(saddle4.m1)} sub="from the end" highlight />
                <Stat label="Mark 2" value={toFraction(saddle4.m2)} sub={`${toFraction(saddle4.travel)} past mark 1`} highlight />
                <Stat label="Mark 3" value={toFraction(saddle4.m3)} sub={`${toFraction(saddle4.top)} past mark 2 (width + clearance)`} highlight />
                <Stat label="Mark 4" value={toFraction(saddle4.m4)} sub={`${toFraction(saddle4.travel)} past mark 3`} highlight />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Stat label="Outer-to-inner" value={toFraction(saddle4.travel)} sub={`${toFraction(saddle4.h)} × ${saddle4.mult.toFixed(1)} (${saddleAngle}° multiplier)`} />
                <Stat label="Total shrink" value={toFraction(saddle4.shrink)} sub={`Two offsets at ${SHRINK_PER_IN[saddleAngle] * 16}/16" per inch of rise`} />
                <Stat label="Bends" value={`${saddleAngle}° × 4`} sub="Up at 1, back at 2; up at 3, back at 4 — all in one plane." />
              </div>
              <Steps
                title="How to bend it"
                steps={[
                  `Mark 2 sits ${toFraction(SADDLE_CLEAR)} short of the obstruction plus ${toFraction(saddle4.shrink / 2)} for the first offset's shrink: ${toFraction(saddle4.m2)} from the end. Mark 1 is ${toFraction(saddle4.travel)} before it, mark 3 is ${toFraction(saddle4.top)} after it, mark 4 is ${toFraction(saddle4.travel)} after that.`,
                  `Bend the first offset: arrow on mark 1, ${saddleAngle}° up; arrow on mark 2, conduit rolled 180°, ${saddleAngle}° back to level.`,
                  `Bend the second offset the opposite way: arrow on mark 3, ${saddleAngle}° down; arrow on mark 4, ${saddleAngle}° back to level. Keep every bend in the same plane.`,
                ]}
              />
              <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
            </>
          ) : saddle4 ? (
            <Warn>
              The obstruction is too close to the end: mark 1 would fall {toFraction(-saddle4.m1)} past the end of the conduit. Move it out to at least{" "}
              {toFraction(saddle4.D - saddle4.m1)} or pick a steeper angle.
            </Warn>
          ) : (
            <p className="mt-6 text-sm text-bone-500">Enter the obstruction size to get your marks.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
