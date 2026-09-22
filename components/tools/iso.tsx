"use client";

/**
 * Tiny isometric renderer for the calculators. Everything is projected into
 * a fixed viewBox and auto-fitted to it, so a 2-ft slab and a 100-ft slab
 * both fill the pane and nothing ever runs off the edge.
 *
 * World axes: x runs right-and-down on screen, y runs left-and-down, z is up.
 * Larger x + y is nearer the viewer, so the faces at max x and max y are the
 * visible sides of a box.
 */

export type V3 = [number, number, number];
export type Pt = { x: number; y: number };

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);

function raw([x, y, z]: V3): Pt {
  return { x: (x - y) * C, y: (x + y) * S - z };
}

export interface Projector {
  P: (x: number, y: number, z: number) => Pt;
  /** Screen pixels per world unit. */
  k: number;
  /** Ellipse radii for a horizontal circle of world radius r. */
  ellipse: (r: number) => { rx: number; ry: number };
  pts: (...v: V3[]) => string;
}

/** Build a projector that fits every corner in `corners` into W×H with `pad` px to spare. */
export function fitIso(corners: V3[], W: number, H: number, pad = 28): Projector {
  const rp = corners.map(raw);
  const minX = Math.min(...rp.map((p) => p.x));
  const maxX = Math.max(...rp.map((p) => p.x));
  const minY = Math.min(...rp.map((p) => p.y));
  const maxY = Math.max(...rp.map((p) => p.y));
  const k = Math.min((W - pad * 2) / Math.max(maxX - minX, 1e-6), (H - pad * 2) / Math.max(maxY - minY, 1e-6));
  const ox = (W - (maxX - minX) * k) / 2 - minX * k;
  const oy = (H - (maxY - minY) * k) / 2 - minY * k;
  const P = (x: number, y: number, z: number) => {
    const p = raw([x, y, z]);
    return { x: p.x * k + ox, y: p.y * k + oy };
  };
  return {
    P,
    k,
    ellipse: (r) => ({ rx: r * C * Math.SQRT2 * k, ry: r * S * Math.SQRT2 * k }),
    pts: (...v) => v.map((c) => P(...c)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
  };
}

/** Corners of an axis-aligned box — feed these to fitIso. */
export function boxCorners(x0: number, y0: number, z0: number, dx: number, dy: number, dz: number): V3[] {
  const out: V3[] = [];
  for (const a of [0, 1]) for (const b of [0, 1]) for (const c of [0, 1]) out.push([x0 + a * dx, y0 + b * dy, z0 + c * dz]);
  return out;
}

export const INK = { top: "#3a3f4c", right: "#2c303a", left: "#23262e", line: "#8a8fa0", floor: "#1c1f2a" };
export const SAFETY = "#f5b83d";
export const DIM = "#8a8fa0";
export const MONEY = "#34d399";

/** A solid box with three shaded faces. */
export function IsoBox({
  pr,
  x,
  y,
  z,
  dx,
  dy,
  dz,
  top = INK.top,
  right = INK.right,
  left = INK.left,
  stroke = INK.line,
  topStroke,
  opacity = 1,
}: {
  pr: Projector;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  top?: string;
  right?: string;
  left?: string;
  stroke?: string;
  topStroke?: string;
  opacity?: number;
}) {
  const { pts } = pr;
  return (
    <g opacity={opacity}>
      {/* face at y = y+dy (screen-left) */}
      <polygon
        points={pts([x, y + dy, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x, y + dy, z + dz])}
        fill={left}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* face at x = x+dx (screen-right) */}
      <polygon
        points={pts([x + dx, y, z], [x + dx, y + dy, z], [x + dx, y + dy, z + dz], [x + dx, y, z + dz])}
        fill={right}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* top */}
      <polygon
        points={pts([x, y, z + dz], [x + dx, y, z + dz], [x + dx, y + dy, z + dz], [x, y + dy, z + dz])}
        fill={top}
        stroke={topStroke ?? stroke}
        strokeWidth={topStroke ? 2 : 1.5}
        strokeLinejoin="round"
      />
    </g>
  );
}

/** A vertical cylinder standing on z, with an optional liquid level (0–1). */
export function IsoCylinder({
  pr,
  cx,
  cy,
  z,
  r,
  h,
  level = 0,
  body = INK.right,
  top = INK.top,
  liquid = SAFETY,
  stroke = INK.line,
}: {
  pr: Projector;
  cx: number;
  cy: number;
  z: number;
  r: number;
  h: number;
  level?: number;
  body?: string;
  top?: string;
  liquid?: string;
  stroke?: string;
}) {
  const { P, ellipse } = pr;
  const { rx, ry } = ellipse(r);
  const b = P(cx, cy, z);
  const t = P(cx, cy, z + h);
  const lv = P(cx, cy, z + h * Math.min(Math.max(level, 0), 1));
  const side = (from: Pt, to: Pt) =>
    `M ${from.x - rx} ${from.y} A ${rx} ${ry} 0 0 0 ${from.x + rx} ${from.y} L ${to.x + rx} ${to.y} A ${rx} ${ry} 0 0 1 ${to.x - rx} ${to.y} Z`;
  return (
    <g>
      <path d={side(b, t)} fill={body} stroke={stroke} strokeWidth={1.5} />
      {level > 0 ? (
        <>
          <path d={side(b, lv)} fill={liquid} opacity={0.55} />
          <ellipse cx={lv.x} cy={lv.y} rx={rx} ry={ry} fill={liquid} opacity={0.85} />
        </>
      ) : null}
      <ellipse cx={t.x} cy={t.y} rx={rx} ry={ry} fill={top} stroke={stroke} strokeWidth={1.5} />
    </g>
  );
}

/** Wrapper: fixed aspect, always full-width, never overflows the card. */
export function IsoStage({
  W,
  H,
  label,
  children,
  className = "",
}: {
  W: number;
  H: number;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mt-6 overflow-hidden rounded-xl border border-ink-700 bg-ink-900/60 ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        {children}
      </svg>
    </div>
  );
}
