"use client";

import { useMemo, useState } from "react";
import { Field, Seg, SliderInput, Stat, fmt } from "../ui";
import { DIM, INK, IsoBox, IsoCylinder, IsoStage, SAFETY, boxCorners, fitIso } from "../iso";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Tab = "tank" | "tankless";

const TANK_SIZES = [30, 40, 50, 65, 75, 80];

/** Real tank proportions by size (diameter × height, inches), typical residential. */
const TANK_DIMS: Record<number, [number, number]> = {
  30: [18, 49],
  40: [18, 58],
  50: [20, 60],
  65: [24, 60],
  75: [24, 66],
  80: [26, 66],
};

/**
 * The tank you'd install, drawn at its real diameter and height beside a
 * 6-ft figure, filled to the peak-hour draw so you can see the headroom.
 */
function TankScene({ gallons, peak }: { gallons: number; peak: number }) {
  const W = 480;
  const H = 280;
  const [dIn, hIn] = TANK_DIMS[gallons] ?? [24, 60];
  const r = dIn / 24; // ft
  const h = hIn / 12;
  const figH = 6;
  const fx = r * 2 + 1.6;
  const corners = [...boxCorners(-r, -r, 0, r * 2, r * 2, h + 0.6), ...boxCorners(fx - 0.6, -0.6, 0, 1.2, 1.2, figH)];
  const pr = fitIso(corners, W, H, 34);
  const { P } = pr;
  const level = Math.min(peak / gallons, 1);
  const head = P(fx, 0, figH - 0.4);
  const neck = P(fx, 0, figH - 0.9);
  const hip = P(fx, 0, figH * 0.5);
  const footL = P(fx - 0.4, 0.3, 0);
  const footR = P(fx + 0.4, -0.3, 0);
  const handL = P(fx - 0.6, 0.4, figH * 0.5);
  const handR = P(fx + 0.6, -0.4, figH * 0.5);
  const sh = P(fx, 0, figH - 1.2);
  const cap = P(0, 0, h);
  const pipeTop = P(0.25, -0.25, h + 0.6);
  const pipeBase = P(0.25, -0.25, h);
  const lvl = P(0, 0, h * level);
  const { rx } = pr.ellipse(r);
  const stroke = Math.max(pr.k * 0.18, 2);
  return (
    <IsoStage W={W} H={H} label={`${gallons} gallon tank, filled to ${fmt(peak)} gallons of peak demand`}>
      <ellipse cx={P(0, 0, 0).x} cy={P(0, 0, 0).y + 4} rx={rx * 1.25} ry={pr.ellipse(r).ry * 1.25} fill="#0f1116" />
      <IsoCylinder pr={pr} cx={0} cy={0} z={0} r={r} h={h} level={level} body={INK.right} top="#4a4f5c" />
      {/* hot-out / cold-in stubs */}
      <line x1={pipeBase.x} y1={pipeBase.y} x2={pipeTop.x} y2={pipeTop.y} stroke={DIM} strokeWidth={3} strokeLinecap="round" />
      <line x1={pipeBase.x - rx * 0.9} y1={pipeBase.y} x2={pipeTop.x - rx * 0.9} y2={pipeTop.y} stroke={DIM} strokeWidth={3} strokeLinecap="round" />
      {/* figure */}
      <g stroke="#e6e8eb" strokeWidth={stroke} strokeLinecap="round" fill="none">
        <line x1={neck.x} y1={neck.y} x2={hip.x} y2={hip.y} />
        <line x1={hip.x} y1={hip.y} x2={footL.x} y2={footL.y} />
        <line x1={hip.x} y1={hip.y} x2={footR.x} y2={footR.y} />
        <line x1={sh.x} y1={sh.y} x2={handL.x} y2={handL.y} />
        <line x1={sh.x} y1={sh.y} x2={handR.x} y2={handR.y} />
      </g>
      <circle cx={head.x} cy={head.y} r={Math.max(pr.k * 0.4, 3)} fill="#e6e8eb" />
      {/* labels */}
      <text x={cap.x} y={cap.y - pr.ellipse(r).ry - 22} fill={SAFETY} fontSize={15} fontWeight={800} textAnchor="middle">
        {gallons} gal tank
      </text>
      <text x={cap.x} y={cap.y - pr.ellipse(r).ry - 8} fill={DIM} fontSize={10} fontWeight={700} textAnchor="middle">
        {dIn}&quot; × {hIn}&quot;
      </text>
      <text x={lvl.x - rx - 8} y={lvl.y + 4} fill={SAFETY} fontSize={12} fontWeight={800} textAnchor="end">
        {fmt(peak)} gal peak hour
      </text>
      <text x={W - 12} y={H - 10} fill="#565b64" fontSize={10} fontWeight={700} textAnchor="end">
        Figure is 6 ft
      </text>
    </IsoStage>
  );
}

/**
 * A wall-hung tankless unit with one hot-water stream per fixture running at
 * once. The unit grows a step with the GPM it has to deliver.
 */
function TanklessScene({ gpm, showers, dish, laundry, faucets, rise }: { gpm: number; showers: number; dish: number; laundry: number; faucets: number; rise: string }) {
  const W = 480;
  const H = 260;
  const unitW = 1.5;
  const unitH = 1.6 + Math.min(gpm, 12) * 0.12;
  const unitD = 0.6;
  const wallH = 7;
  const fixtures = [
    ...Array.from({ length: showers }, () => ({ kind: "Shower", flow: 2.0 })),
    ...Array.from({ length: dish }, () => ({ kind: "Dishwasher", flow: 1.5 })),
    ...Array.from({ length: laundry }, () => ({ kind: "Washer", flow: 2.0 })),
    ...Array.from({ length: faucets }, () => ({ kind: "Faucet", flow: 1.0 })),
  ].slice(0, 12);
  const span = Math.max(fixtures.length, 1) * 1.4 + 2;
  const wallW = Math.max(span, 5);
  const corners = [...boxCorners(0, 0, 0, wallW, 4, wallH)];
  const pr = fitIso(corners, W, H, 30);
  const { P, pts } = pr;
  const ux = 0.6;
  const uz = wallH * 0.45;
  const uTop = P(ux + unitW / 2, unitD, uz + unitH);
  return (
    <IsoStage W={W} H={H} label={`Tankless unit delivering ${fmt(gpm, 1)} gallons per minute to ${fixtures.length} fixtures`}>
      {/* wall + floor */}
      <polygon points={pts([0, 0, 0], [wallW, 0, 0], [wallW, 0, wallH], [0, 0, wallH])} fill="#23262e" stroke={DIM} strokeWidth={1.5} strokeLinejoin="round" />
      <polygon points={pts([0, 0, 0], [wallW, 0, 0], [wallW, 4, 0], [0, 4, 0])} fill="#1c1f2a" stroke={DIM} strokeWidth={1.5} />
      {/* unit on the wall */}
      <IsoBox pr={pr} x={ux} y={0} z={uz} dx={unitW} dy={unitD} dz={unitH} top="#3a3f4c" topStroke={SAFETY} />
      {/* exhaust */}
      <polyline points={pts([ux + unitW / 2, unitD / 2, uz + unitH], [ux + unitW / 2, unitD / 2, wallH])} fill="none" stroke={DIM} strokeWidth={3} strokeLinecap="round" />
      {/* hot line along the wall base and one stream per fixture */}
      <polyline points={pts([ux + unitW, unitD / 2, uz], [ux + unitW, unitD / 2, 0.8], [wallW - 0.5, unitD / 2, 0.8])} fill="none" stroke={SAFETY} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {fixtures.map((f, i) => {
        const x = ux + unitW + 1.2 + i * 1.4;
        const base = P(x, unitD / 2, 0.8);
        const head = P(x, unitD / 2 + 1.4, 0.8);
        const w = Math.max(1.5, f.flow * pr.k * 0.07);
        return (
          <g key={i}>
            <line x1={base.x} y1={base.y} x2={head.x} y2={head.y} stroke={SAFETY} strokeWidth={w} strokeLinecap="round" />
            <circle cx={head.x} cy={head.y} r={Math.max(pr.k * 0.22, 3)} fill={SAFETY} />
            <text x={head.x} y={head.y + 16} fill={DIM} fontSize={9} fontWeight={700} textAnchor="middle">
              {f.kind}
            </text>
          </g>
        );
      })}
      <text x={uTop.x} y={uTop.y - 10} fill={SAFETY} fontSize={14} fontWeight={800} textAnchor="middle">
        {fmt(gpm, 1)} GPM
      </text>
      <text x={uTop.x} y={uTop.y + 4} fill={DIM} fontSize={10} fontWeight={700} textAnchor="middle">
        at {rise}°F rise
      </text>
    </IsoStage>
  );
}


export default function WaterHeater() {
  const [tab, setTab] = useState<Tab>("tank");
  const [showers, setShowers] = useState("2");
  const [dishwasher, setDishwasher] = useState("1");
  const [laundry, setLaundry] = useState("1");

  const [tShowers, setTShowers] = useState("2");
  const [tDishwasher, setTDishwasher] = useState("1");
  const [tLaundry, setTLaundry] = useState("0");
  const [tFaucets, setTFaucets] = useState("1");
  const [rise, setRise] = useState("60");

  const tank = useMemo(() => {
    const s = parseInt(showers || "0", 10) || 0;
    const d = parseInt(dishwasher || "0", 10) || 0;
    const l = parseInt(laundry || "0", 10) || 0;
    // Hot-water draw per use in the busiest hour: shower ~10 gal, dishwasher ~6, laundry ~7.
    const peak = s * 10 + d * 6 + l * 7;
    const target = peak * 1.25;
    const recommended = TANK_SIZES.find((t) => t >= target) ?? 80;
    return { peak, recommended, s, d, l };
  }, [showers, dishwasher, laundry]);

  const tankless = useMemo(() => {
    const s = parseInt(tShowers || "0", 10) || 0;
    const d = parseInt(tDishwasher || "0", 10) || 0;
    const l = parseInt(tLaundry || "0", 10) || 0;
    const f = parseInt(tFaucets || "0", 10) || 0;
    // Hot-water flow per simultaneous fixture, in GPM.
    const gpm = s * 2.0 + d * 1.5 + l * 2.0 + f * 1.0;
    return { gpm, s, d, l, f };
  }, [tShowers, tDishwasher, tLaundry, tFaucets]);

  const buildPayload = (): ToolQuotePayload | null => {
    if (tab === "tank") {
      return {
        source: "Water heater sizing calculator",
        sourceHref: "/tools/plumbing/water-heater-sizing-calculator",
        title: `Water heater replacement — ${tank.recommended} gal`,
        notes:
          `Busiest hour: ${tank.s} shower(s), ${tank.d} dishwasher load(s), ${tank.l} laundry load(s) ` +
          `→ ${fmt(tank.peak)} gal peak demand. Sized to ${tank.recommended} gal with 25% buffer.\n` +
          `Check the yellow label: first-hour rating should clear ${fmt(tank.peak)} gal.\n` +
          `Add your equipment price and labor below.`,
        lines: [
          {
            description: `${tank.recommended}-gal water heater — per sizing calc`,
            qty: 1,
            unit_price: 0,
            kind: "materials",
          },
          { description: "Water heater installation labor", qty: 1, unit_price: 0, kind: "labor" },
        ],
      };
    }
    return {
      source: "Water heater sizing calculator",
      sourceHref: "/tools/plumbing/water-heater-sizing-calculator",
      title: "Tankless water heater install",
      notes:
        `Simultaneous demand: ${tankless.s} shower(s), ${tankless.d} dishwasher, ${tankless.l} washer, ` +
        `${tankless.f} faucet(s) → ${fmt(tankless.gpm, 1)} GPM at ${rise}°F rise.\n` +
        `Shop for a unit rated ≥ ${fmt(tankless.gpm, 1)} GPM at that rise.\n` +
        `Add your equipment price and labor below.`,
      lines: [
        {
          description: `Tankless water heater — ≥ ${fmt(tankless.gpm, 1)} GPM at ${rise}°F rise`,
          qty: 1,
          unit_price: 0,
          kind: "materials",
        },
        { description: "Tankless installation labor", qty: 1, unit_price: 0, kind: "labor" },
      ],
    };
  };

  const resultText =
    tab === "tank"
      ? `Water heater: ${fmt(tank.peak)} gal peak-hour demand → ${tank.recommended}-gal tank (first-hour rating should clear ${fmt(tank.peak)} gal).`
      : `Tankless: needs ${fmt(tankless.gpm, 1)} GPM at a ${rise}°F rise.`;

  return (
    <div>
      <Seg<Tab>
        ariaLabel="Heater type"
        value={tab}
        onChange={setTab}
        options={[
          { value: "tank", label: "Tank — what size?" },
          { value: "tankless", label: "Tankless — what flow?" },
        ]}
      />

      {tab === "tank" ? (
        <div className="mt-6">
          <p className="text-sm leading-relaxed text-bone-400">
            Count what runs in the busiest hour of the day — usually the morning rush.
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-3">
            <Field label="Back-to-back showers" hint="~10 gal of hot water each.">
              <SliderInput value={showers} onChange={setShowers} min={0} max={8} step={1} ariaLabel="Number of showers" />
            </Field>
            <Field label="Dishwasher loads" hint="~6 gal each.">
              <SliderInput value={dishwasher} onChange={setDishwasher} min={0} max={4} step={1} ariaLabel="Dishwasher loads" />
            </Field>
            <Field label="Laundry loads" hint="~7 gal each (warm wash).">
              <SliderInput value={laundry} onChange={setLaundry} min={0} max={4} step={1} ariaLabel="Laundry loads" />
            </Field>
          </div>
          <TankScene gallons={tank.recommended} peak={tank.peak} />
          {/* demand meter */}
          <div className="mt-6">
            <div className="flex items-end justify-between text-xs font-bold uppercase tracking-[0.12em] text-bone-500">
              <span>Peak-hour demand</span>
              <span className="font-display text-2xl tracking-wide text-paper">{fmt(tank.peak)} gal</span>
            </div>
            <div className="mt-2 h-4 overflow-hidden rounded-full border border-ink-600 bg-ink-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-safety-600 via-safety-400 to-ember-500 transition-all duration-300"
                style={{ width: `${Math.min((tank.peak / 100) * 100, 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-bone-600">
              <span>0</span>
              <span>30</span>
              <span>50</span>
              <span>80+ gal</span>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Peak-hour demand"
              value={`${fmt(tank.peak)} gal`}
              sub="Hot water used in the busiest hour"
              highlight
            />
            <Stat
              label="Recommended tank"
              value={`${tank.recommended} gal`}
              sub="Smallest standard size with a 25% buffer"
            />
            <Stat
              label="First-hour rating to beat"
              value={`${fmt(tank.peak)} gal`}
              sub="Check the yellow EnergyGuide label — FHR should clear this"
            />
          </div>
          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-sm leading-relaxed text-bone-400">
            Tankless units are sized by flow — add up everything that might run at once.
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <Field label="Simultaneous showers" hint="2.0 GPM of hot water each.">
              <SliderInput value={tShowers} onChange={setTShowers} min={0} max={5} step={1} ariaLabel="Simultaneous showers" />
            </Field>
            <Field label="Dishwasher running" hint="1.5 GPM.">
              <SliderInput value={tDishwasher} onChange={setTDishwasher} min={0} max={2} step={1} ariaLabel="Dishwashers running" />
            </Field>
            <Field label="Washing machine running" hint="2.0 GPM.">
              <SliderInput value={tLaundry} onChange={setTLaundry} min={0} max={2} step={1} ariaLabel="Washing machines running" />
            </Field>
            <Field label="Other faucets" hint="1.0 GPM each.">
              <SliderInput value={tFaucets} onChange={setTFaucets} min={0} max={6} step={1} ariaLabel="Other faucets" />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Temperature rise" hint="Set-point minus incoming groundwater temperature — colder water makes the unit work harder.">
              <SliderInput value={rise} onChange={setRise} min={30} max={100} step={5} suffix="°F" ariaLabel="Temperature rise" />
              <p className="mt-1.5 text-xs text-bone-500">Roughly 40°F in the South, 60°F in the middle, 80°F up north.</p>
            </Field>
          </div>
          <TanklessScene gpm={tankless.gpm} showers={tankless.s} dish={tankless.d} laundry={tankless.l} faucets={tankless.f} rise={rise} />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat
              label="Required flow rate"
              value={`${fmt(tankless.gpm, 1)} GPM`}
              sub="Of hot water, all at once"
              highlight
            />
            <Stat
              label="What to shop for"
              value={`${fmt(tankless.gpm, 1)}+ GPM`}
              sub={`Rated at a ${rise}°F rise — check the spec sheet, not the headline number`}
            />
          </div>
          <QuoteBridge buildPayload={buildPayload} resultText={resultText} />
        </div>
      )}
    </div>
  );
}
