"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { CheckRow, Field, SliderInput, Stat, StepSlider, fmt } from "../ui";
import { DIM, IsoBox, IsoCylinder, IsoStage, SAFETY, boxCorners, fitIso } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Awg = "14" | "12" | "10" | "8" | "6";
type Family = "any" | "round" | "square" | "device";

/** Volume allowance per conductor, NEC Table 314.16(B). */
const VOLUME: Record<Awg, number> = { "14": 2.0, "12": 2.25, "10": 2.5, "8": 3.0, "6": 5.0 };

/** Wire diameter with insulation (THHN), inches — for the drawing only. */
const DIA: Record<Awg, number> = { "14": 0.11, "12": 0.13, "10": 0.16, "8": 0.22, "6": 0.26 };

type Box = { name: string; family: Exclude<Family, "any">; vol: number; l: number; w: number; d: number };

/** Standard metal boxes, NEC Table 314.16(A). Dimensions in inches for the drawing. */
const BOXES: Box[] = [
  { name: "4 × 1-1/4 round / octagon", family: "round", vol: 12.5, l: 4, w: 4, d: 1.25 },
  { name: "4 × 1-1/2 round / octagon", family: "round", vol: 15.5, l: 4, w: 4, d: 1.5 },
  { name: "4 × 2-1/8 round / octagon", family: "round", vol: 21.5, l: 4, w: 4, d: 2.125 },
  { name: "4 × 1-1/4 square", family: "square", vol: 18.0, l: 4, w: 4, d: 1.25 },
  { name: "4 × 1-1/2 square", family: "square", vol: 21.0, l: 4, w: 4, d: 1.5 },
  { name: "4 × 2-1/8 square", family: "square", vol: 30.3, l: 4, w: 4, d: 2.125 },
  { name: "4-11/16 × 1-1/4 square", family: "square", vol: 25.5, l: 4.6875, w: 4.6875, d: 1.25 },
  { name: "4-11/16 × 1-1/2 square", family: "square", vol: 29.5, l: 4.6875, w: 4.6875, d: 1.5 },
  { name: "4-11/16 × 2-1/8 square", family: "square", vol: 42.0, l: 4.6875, w: 4.6875, d: 2.125 },
  { name: "3 × 2 × 1-1/2 device", family: "device", vol: 7.5, l: 3, w: 2, d: 1.5 },
  { name: "3 × 2 × 2 device", family: "device", vol: 10.0, l: 3, w: 2, d: 2 },
  { name: "3 × 2 × 2-1/4 device", family: "device", vol: 10.5, l: 3, w: 2, d: 2.25 },
  { name: "3 × 2 × 2-1/2 device", family: "device", vol: 12.5, l: 3, w: 2, d: 2.5 },
  { name: "3 × 2 × 2-3/4 device", family: "device", vol: 14.0, l: 3, w: 2, d: 2.75 },
  { name: "3 × 2 × 3-1/2 device", family: "device", vol: 18.0, l: 3, w: 2, d: 3.5 },
];

const FAMILY_LABEL: Record<Exclude<Family, "any">, string> = { round: "Round / octagon", square: "Square", device: "Device" };

/**
 * The box drawn open: floor plus the two far walls, standing on its back the
 * way it sits in a wall so the depth reads as height. Conductors stand in it
 * as cylinders; the amber block is the required volume as a share of the
 * box's volume, so an overfilled box shows the block poking out the top.
 */
function BoxScene({ box, wires, awg, required, ratio }: { box: Box; wires: number; awg: Awg; required: number; ratio: number }) {
  const W = 480;
  const H = 260;
  const L = box.l;
  const Wd = box.w;
  const h = box.d;
  // fit against a fixed 3.5" depth so switching boxes changes the drawing, not the scale
  const corners = boxCorners(0, 0, 0, Math.max(L, 4.7), Math.max(Wd, 4.7), 3.5 * 1.35);
  const pr = fitIso(corners, W, H, 30);
  const { P, pts } = pr;
  const fillH = Math.min(ratio, 1.35) * h;
  const over = ratio > 1;
  const shown = Math.min(wires, 24);
  const r = DIA[awg] / 2;
  // a loose grid inside the box, inset from the walls
  const cols = Math.max(1, Math.ceil(Math.sqrt(shown * (L / Wd))));
  const rows = Math.max(1, Math.ceil(shown / cols));
  const figs = Array.from({ length: shown }, (_, i) => ({
    x: L * (0.16 + 0.68 * ((i % cols) + 0.5) / cols),
    y: Wd * (0.16 + 0.68 * (Math.floor(i / cols) + 0.5) / rows),
  }));
  const wireH = h * 0.8;
  const fillTop = P(L / 2, Wd, fillH);
  const label = P(L / 2, Wd, 0);
  const dLabel = P(0, 0, h / 2);
  const fillColor = over ? "#ea580c" : SAFETY;

  return (
    <IsoStage W={W} H={H} label={`${box.name} box, ${fmt(required, 2)} of ${fmt(box.vol, 1)} cubic inches used`}>
      {/* floor */}
      <polygon points={pts([0, 0, 0], [L, 0, 0], [L, Wd, 0], [0, Wd, 0])} fill="#1c1f2a" stroke={DIM} strokeWidth={1.5} />
      {/* far walls: y = 0 and x = 0 */}
      <polygon points={pts([0, 0, 0], [L, 0, 0], [L, 0, h], [0, 0, h])} fill="#2c303a" stroke={DIM} strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={pts([0, 0, 0], [0, Wd, 0], [0, Wd, h], [0, 0, h])} fill="#23262e" stroke={DIM} strokeWidth={1.5} strokeLinejoin="round" />
      {/* conductors */}
      {figs.map((f, i) => (
        <IsoCylinder key={i} pr={pr} cx={f.x} cy={f.y} z={0} r={Math.max(r, 0.09)} h={wireH} body={i % 5 === 4 ? "#3f8f5a" : i % 2 === 0 ? "#1f1f1f" : "#e6e8eb"} top={i % 5 === 4 ? "#5fb87a" : i % 2 === 0 ? "#3a3a3a" : "#ffffff"} stroke="#0a0b0d" />
      ))}
      {/* fill block */}
      <IsoBox pr={pr} x={0} y={0} z={0} dx={L} dy={Wd} dz={fillH} top={fillColor} right={fillColor} left={fillColor} stroke={fillColor} opacity={0.38} />
      {/* open rim */}
      <polyline points={pts([L, 0, h], [L, Wd, h], [0, Wd, h])} fill="none" stroke={DIM} strokeWidth={1.5} strokeDasharray="4 4" />
      {/* labels */}
      <text x={fillTop.x} y={fillTop.y - 8} fill={over ? "#fb923c" : SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        {fmt(required, 2)} of {fmt(box.vol, 1)} in³
      </text>
      <text x={label.x} y={label.y + 20} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        {box.name.toUpperCase()}
      </text>
      <text x={label.x} y={label.y + 34} fill={over ? "#fb923c" : DIM} fontSize={11} fontWeight={700} textAnchor="middle">
        {fmt(ratio * 100, 0)}% full{over ? " — too small" : ""}
      </text>
      <text x={dLabel.x - 8} y={dLabel.y} fill={DIM} fontSize={11} fontWeight={700} textAnchor="end">
        {fmt(h, 3)}&quot; deep
      </text>
      {wires > shown ? (
        <text x={12} y={H - 10} fill={DIM} fontSize={11} fontWeight={700}>
          {wires} conductors, {shown} drawn
        </text>
      ) : null}
    </IsoStage>
  );
}

export default function BoxFill() {
  const [q, set] = useUrlState({ sz: "12", c: "6", g: "3", cl: "1", f: "0", d: "1", t: "0", fam: "any" });
  const awg = (["14", "12", "10", "8", "6"].includes(q.sz) ? q.sz : "12") as Awg;
  const family = (["any", "round", "square", "device"].includes(q.fam) ? q.fam : "any") as Family;
  const setAwg = set("sz") as (v: Awg) => void;
  const setFamily = set("fam") as (v: Family) => void;
  const setConductors = set("c");
  const setGrounds = set("g");
  const setClamps = set("cl");
  const setFittings = set("f");
  const setDevices = set("d");
  const setThrough = set("t");
  const through = q.t === "1";

  const calc = useMemo(() => {
    const n = (s: string, max: number) => Math.min(Math.max(Math.floor(parseFloat(s) || 0), 0), max);
    const conductors = n(q.c, 60);
    const grounds = n(q.g, 20);
    const clamps = n(q.cl, 1);
    const fittings = n(q.f, 8);
    const devices = n(q.d, 12);
    const vol = VOLUME[awg];
    // 314.16(B)(1): each conductor that enters and leaves, or ends in, the box
    // counts once. One unbroken pass-through loop counts once, not twice.
    const conductorAllow = Math.max(0, conductors - (through && conductors >= 2 ? 1 : 0));
    const groundAllow = grounds > 0 ? 1 : 0; // (B)(5): all EGCs together count once
    const clampAllow = clamps > 0 ? 1 : 0; // (B)(2): any number of internal clamps count once
    const fittingAllow = fittings; // (B)(3): one each
    const deviceAllow = devices * 2; // (B)(4): two per yoke
    const allowances = conductorAllow + groundAllow + clampAllow + fittingAllow + deviceAllow;
    const required = allowances * vol;
    const rows = BOXES.map((b) => ({ ...b, ok: b.vol >= required, pct: b.vol > 0 ? required / b.vol : 0 }));
    const firstOk = (fam: Exclude<Family, "any">) => rows.filter((b) => b.family === fam).find((b) => b.ok) ?? null;
    const bestByFamily = { round: firstOk("round"), square: firstOk("square"), device: firstOk("device") };
    const candidates = family === "any" ? rows : rows.filter((b) => b.family === family);
    const passing = candidates.filter((b) => b.ok).sort((a, b) => a.vol - b.vol);
    const rec = passing[0] ?? null;
    // nothing passes: show the largest in the family so the drawing shows the overflow
    const shown = rec ?? [...candidates].sort((a, b) => b.vol - a.vol)[0];
    const wires = conductors + grounds;
    return { conductors, grounds, clamps, fittings, devices, vol, conductorAllow, groundAllow, clampAllow, fittingAllow, deviceAllow, allowances, required, rows, bestByFamily, rec, shown, wires };
  }, [q.c, q.g, q.cl, q.f, q.d, awg, family, through]);

  const buildPayload = (): ToolQuotePayload | null => {
    if (!calc.rec) return null;
    const { rec, required, allowances, vol } = calc;
    return {
      source: "Box fill calculator",
      sourceHref: "/tools/electrical/box-fill-calculator",
      title: `Box fill — ${rec.name}, ${fmt(required, 2)} in³ required`,
      notes:
        `${allowances} volume allowances × ${fmt(vol, 2)} in³ (${awg} AWG, NEC Table 314.16(B)) = ${fmt(required, 2)} in³ required.\n` +
        `${calc.conductorAllow} conductors, ${calc.groundAllow} for grounds, ${calc.clampAllow} for clamps, ${calc.fittingAllow} for fittings, ${calc.deviceAllow} for ${calc.devices} device yoke${calc.devices === 1 ? "" : "s"}.\n` +
        `Use ${rec.name} box — ${fmt(rec.vol, 1)} in³ (NEC Table 314.16(A)), ${fmt(rec.pct * 100, 0)}% full. Nonmetallic boxes: use the volume stamped inside.`,
      lines: [
        {
          description: `${rec.name} box, ${fmt(rec.vol, 1)} in³ (box fill calc)`,
          qty: 1,
          unit_price: 0,
          kind: "materials",
        },
      ],
    };
  };

  const resultText = calc.rec
    ? `Box fill: ${calc.allowances} allowances × ${fmt(calc.vol, 2)} in³ (${awg} AWG) = ${fmt(calc.required, 2)} in³ required → ${calc.rec.name} box (${fmt(calc.rec.vol, 1)} in³, ${fmt(calc.rec.pct * 100, 0)}% full), per NEC 314.16.`
    : `Box fill: ${fmt(calc.required, 2)} in³ required — no standard ${family === "any" ? "" : `${FAMILY_LABEL[family].toLowerCase()} `}box in NEC Table 314.16(A) is large enough. Use a larger box, extension ring, or pull box.`;

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Conductor size" hint="Largest conductor in the box. Allowances are taken at this size.">
          <StepSlider<Awg>
            ariaLabel="Conductor size"
            value={awg}
            onChange={setAwg}
            options={[
              { value: "14", label: "14 AWG" },
              { value: "12", label: "12 AWG" },
              { value: "10", label: "10 AWG" },
              { value: "8", label: "8 AWG" },
              { value: "6", label: "6 AWG" },
            ]}
          />
        </Field>
        <Field label="Box family" hint="Filter to the style you have on the truck, or let it pick the smallest overall.">
          <StepSlider<Family>
            ariaLabel="Box family"
            value={family}
            onChange={setFamily}
            options={[
              { value: "any", label: "Any" },
              { value: "round", label: "Round / oct" },
              { value: "square", label: "Square" },
              { value: "device", label: "Device" },
            ]}
          />
        </Field>
        <Field label="Insulated conductors entering the box" hint="Hots and neutrals only — count every one that enters. Pigtails that never leave the box don't count.">
          <SliderInput value={q.c} onChange={setConductors} min={0} max={30} step={1} suffix="wires" ariaLabel="Insulated conductors entering the box" />
        </Field>
        <Field label="Equipment grounding conductors" hint="All the grounds together count as one allowance, at the largest ground's size.">
          <SliderInput value={q.g} onChange={setGrounds} min={0} max={10} step={1} suffix="EGCs" ariaLabel="Equipment grounding conductors" />
        </Field>
        <Field label="Internal cable clamps" hint="Any number of internal clamps count once. External clamps and connectors in knockouts don't count.">
          <SliderInput value={q.cl} onChange={setClamps} min={0} max={1} step={1} suffix="set" ariaLabel="Internal cable clamps present" />
        </Field>
        <Field label="Support fittings (hickeys, fixture studs)" hint="One allowance each.">
          <SliderInput value={q.f} onChange={setFittings} min={0} max={4} step={1} suffix="each" ariaLabel="Support fittings" />
        </Field>
        <Field label="Devices / yokes" hint="Receptacles, switches, dimmers. Each yoke counts as two allowances.">
          <SliderInput value={q.d} onChange={setDevices} min={0} max={6} step={1} suffix="yokes" ariaLabel="Devices or yokes" />
        </Field>
        <div className="flex items-end">
          <CheckRow
            checked={through}
            onChange={(v) => setThrough(v ? "1" : "0")}
            label="One conductor passes through unbroken"
            hint="A looped, unspliced conductor counts once, not twice, per 314.16(B)(1). Subtracts one from the conductor count."
          />
        </div>
      </div>

      <BoxScene box={calc.shown} wires={calc.wires} awg={awg} required={calc.required} ratio={calc.shown.vol > 0 ? calc.required / calc.shown.vol : 0} />

      {!calc.rec ? (
        <p className="mt-4 rounded-xl border border-ember-600/50 bg-ember-600/10 p-4 text-sm leading-relaxed text-bone-200">
          No standard {family === "any" ? "" : `${FAMILY_LABEL[family].toLowerCase()} `}box in Table 314.16(A) holds {fmt(calc.required, 2)} in³.
          Add an extension ring (its volume adds to the box), gang boxes, or move up to a pull box sized per NEC 314.28.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Required volume" value={`${fmt(calc.required, 2)} in³`} sub={`${calc.allowances} allowances × ${fmt(calc.vol, 2)} in³ for ${awg} AWG`} highlight />
        <Stat
          label="Use this box"
          value={calc.rec ? `${fmt(calc.rec.vol, 1)} in³` : "—"}
          sub={calc.rec ? `${calc.rec.name} · ${fmt(calc.rec.pct * 100, 0)}% full` : "Nothing standard is big enough"}
        />
        <Stat
          label="Allowance breakdown"
          value={`${calc.conductorAllow} + ${calc.groundAllow} + ${calc.clampAllow} + ${calc.fittingAllow} + ${calc.deviceAllow}`}
          sub="conductors + grounds + clamps + fittings + devices (314.16(B)(1)–(5))"
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-ink-600">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-ink-900 text-left text-[11px] uppercase tracking-[0.12em] text-bone-500">
              <th className="px-4 py-3 font-bold">Box (Table 314.16(A))</th>
              <th className="px-4 py-3 font-bold">Volume</th>
              <th className="px-4 py-3 font-bold">Fill</th>
              <th className="px-4 py-3 text-right font-bold">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {calc.rows.map((r) => {
              const isBest = calc.bestByFamily[r.family]?.name === r.name;
              const isRec = calc.rec?.name === r.name;
              return (
                <tr key={r.name} className={`border-t border-ink-700 ${isRec ? "bg-safety-500/10" : isBest ? "bg-ink-800/60" : ""}`}>
                  <td className="px-4 py-2.5 font-bold text-paper">
                    {r.name}
                    {isRec ? <span className="ml-2 text-xs font-bold text-safety-300">← use this</span> : isBest ? <span className="ml-2 text-xs font-bold text-bone-400">smallest {FAMILY_LABEL[r.family].toLowerCase()}</span> : null}
                  </td>
                  <td className="px-4 py-2.5 text-bone-300">{fmt(r.vol, 1)} in³</td>
                  <td className={`px-4 py-2.5 ${r.ok ? "text-bone-300" : "text-ember-400"}`}>{fmt(r.pct * 100, 0)}%</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${r.ok ? "text-emerald-400" : "text-ember-400"}`}>{r.ok ? "✓" : "✗ too small"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-bone-500">
        Plastic and other nonmetallic boxes aren&apos;t in Table 314.16(A) — their volume is stamped inside the box (314.16(A)(2)).
        Use that number against the required volume above. Plaster rings and extension rings that are marked with a volume add
        to the box&apos;s total.
      </p>

      <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
    </div>
  );
}
