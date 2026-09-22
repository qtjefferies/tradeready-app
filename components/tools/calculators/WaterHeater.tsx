"use client";

import { useMemo, useState } from "react";
import { Field, NumInput, Seg, Stat, fmt } from "../ui";
import QuoteBridge from "../QuoteBridge";
import type { ToolQuotePayload } from "@/lib/toolQuote";

type Tab = "tank" | "tankless";
type Rise = "40" | "60" | "80";

const TANK_SIZES = [30, 40, 50, 65, 75, 80];

export default function WaterHeater() {
  const [tab, setTab] = useState<Tab>("tank");
  const [showers, setShowers] = useState("2");
  const [dishwasher, setDishwasher] = useState("1");
  const [laundry, setLaundry] = useState("1");

  const [tShowers, setTShowers] = useState("2");
  const [tDishwasher, setTDishwasher] = useState("1");
  const [tLaundry, setTLaundry] = useState("0");
  const [tFaucets, setTFaucets] = useState("1");
  const [rise, setRise] = useState<Rise>("60");

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
          <div className="mt-4 grid gap-5 sm:grid-cols-3">
            <Field label="Back-to-back showers" hint="~10 gal of hot water each.">
              <NumInput value={showers} onChange={setShowers} min={0} step="1" ariaLabel="Number of showers" />
            </Field>
            <Field label="Dishwasher loads" hint="~6 gal each.">
              <NumInput value={dishwasher} onChange={setDishwasher} min={0} step="1" ariaLabel="Dishwasher loads" />
            </Field>
            <Field label="Laundry loads" hint="~7 gal each (warm wash).">
              <NumInput value={laundry} onChange={setLaundry} min={0} step="1" ariaLabel="Laundry loads" />
            </Field>
          </div>
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
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Field label="Simultaneous showers" hint="2.0 GPM of hot water each.">
              <NumInput value={tShowers} onChange={setTShowers} min={0} step="1" ariaLabel="Simultaneous showers" />
            </Field>
            <Field label="Dishwasher running" hint="1.5 GPM.">
              <NumInput value={tDishwasher} onChange={setTDishwasher} min={0} step="1" ariaLabel="Dishwashers running" />
            </Field>
            <Field label="Washing machine running" hint="2.0 GPM.">
              <NumInput value={tLaundry} onChange={setTLaundry} min={0} step="1" ariaLabel="Washing machines running" />
            </Field>
            <Field label="Other faucets" hint="1.0 GPM each.">
              <NumInput value={tFaucets} onChange={setTFaucets} min={0} step="1" ariaLabel="Other faucets" />
            </Field>
          </div>
          <div className="mt-5">
            <Field label="Temperature rise" hint="Groundwater is colder up north — the unit works harder.">
              <Seg<Rise>
                ariaLabel="Temperature rise"
                value={rise}
                onChange={setRise}
                options={[
                  { value: "40", label: "Warm climate · 40°F" },
                  { value: "60", label: "Moderate · 60°F" },
                  { value: "80", label: "Cold climate · 80°F" },
                ]}
              />
            </Field>
          </div>
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
