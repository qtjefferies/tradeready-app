"use client";

import { useMemo, useState } from "react";
import { Field, SliderInput, Stat, fmt } from "../ui";
import { DIM, IsoBox, IsoStage, SAFETY, boxCorners, fitIso } from "../iso";


/**
 * One billable day (8 hours) stacked as pay, overhead and profit, beside a
 * single billable hour at the rate. Heights are to scale, so dragging the
 * margin or the hours visibly moves both blocks.
 */
function RateScene({ salary, overhead, profit, target, rate }: { salary: number; overhead: number; profit: number; target: number; rate: number }) {
  const W = 480;
  const H = 260;
  const day = rate * 8;
  const unit = day / 10 || 1; // the day is 10 world units tall
  const zPay = (day * (salary / target)) / unit;
  const zOv = (day * (overhead / target)) / unit;
  const zPr = (day * (profit / target)) / unit;
  const hourH = 10 / 8;
  const bw = 3;
  const gap = 4;
  const hx = bw + gap;
  const corners = [...boxCorners(0, 0, 0, bw, bw, 11.4), ...boxCorners(hx, 0, -2.2, bw, bw, hourH + 2.2)];
  const pr = fitIso(corners, W, H, 30);
  const { P } = pr;
  const lab = (z: number) => P(bw, bw, z);
  const stackTop = P(bw / 2, bw, 10);
  const hourBase = P(hx + bw / 2, bw, 0);
  // labels, pushed apart so thin slices don't collide
  const segs = [
    { z: zPay / 2, show: zPay > 0, text: `Pay $${fmt((day * salary) / target, 0)}`, color: SAFETY },
    { z: zPay + zOv / 2, show: zOv > 0, text: `Overhead $${fmt((day * overhead) / target, 0)}`, color: "#c9cdd3" },
    { z: zPay + zOv + zPr / 2, show: zPr > 0, text: `Profit $${fmt((day * profit) / target, 0)}`, color: "#fb923c" },
  ]
    .filter((x) => x.show)
    .map((x) => ({ ...x, y: lab(x.z).y + 4, x: lab(x.z).x + 10 }));
  for (let i = 1; i < segs.length; i++) segs[i].y = Math.min(segs[i].y, segs[i - 1].y - 15);
  return (
    <IsoStage W={W} H={H} label={`One billable day of ${fmt(day, 0)} dollars split into pay, overhead and profit; one hour at ${fmt(rate)} dollars`}>
      <polygon points={pr.pts([-0.8, -0.8, 0], [hx + bw + 0.8, -0.8, 0], [hx + bw + 0.8, bw + 0.8, 0], [-0.8, bw + 0.8, 0])} fill="#0f1116" />
      {zPay > 0 ? <IsoBox pr={pr} x={0} y={0} z={0} dx={bw} dy={bw} dz={zPay} top="#f5b83d" right="#c98e1f" left="#a87515" stroke="#0a0b0d" /> : null}
      {zOv > 0 ? <IsoBox pr={pr} x={0} y={0} z={zPay} dx={bw} dy={bw} dz={zOv} top="#6b7080" right="#565b64" left="#464a52" stroke="#0a0b0d" /> : null}
      {zPr > 0 ? <IsoBox pr={pr} x={0} y={0} z={zPay + zOv} dx={bw} dy={bw} dz={zPr} top="#f97316" right="#c2410c" left="#9a3412" stroke="#0a0b0d" /> : null}
      <IsoBox pr={pr} x={hx} y={0} z={0} dx={bw} dy={bw} dz={hourH} top="#4a4f5c" topStroke={SAFETY} />
      {segs.map((x) => (
        <text key={x.text} x={x.x} y={x.y} fill={x.color} fontSize={11} fontWeight={800}>
          {x.text}
        </text>
      ))}
      <text x={stackTop.x} y={stackTop.y - 30} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        ONE BILLABLE DAY
      </text>
      <text x={stackTop.x} y={stackTop.y - 16} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        ${fmt(day, 0)}
      </text>
      <text x={hourBase.x} y={hourBase.y + 20} fill="#fff" fontSize={11} fontWeight={800} textAnchor="middle">
        ONE HOUR
      </text>
      <text x={hourBase.x} y={hourBase.y + 36} fill={SAFETY} fontSize={13} fontWeight={800} textAnchor="middle">
        ${fmt(rate)}
      </text>
      <text x={hourBase.x} y={hourBase.y + 50} fill={DIM} fontSize={10} fontWeight={700} textAnchor="middle">
        8 of these make the day
      </text>
    </IsoStage>
  );
}

export default function HourlyRate() {
  const [salary, setSalary] = useState("75000");
  const [overhead, setOverhead] = useState("18000");
  const [margin, setMargin] = useState("10");
  const [hrsWeek, setHrsWeek] = useState("30");
  const [weeks, setWeeks] = useState("48");

  const result = useMemo(() => {
    const s = parseFloat(salary) || 0;
    const o = parseFloat(overhead) || 0;
    const m = parseFloat(margin) || 0;
    const h = parseFloat(hrsWeek);
    const w = parseFloat(weeks);
    if (!isFinite(h) || h <= 0 || !isFinite(w) || w <= 0) return null;
    const costs = s + o;
    const profit = costs * (m / 100);
    const target = costs + profit;
    const hours = h * w;
    const rate = target / hours;
    return { target, hours, rate, day: rate * 8, costs, salary: s, overhead: o, profit };
  }, [salary, overhead, margin, hrsWeek, weeks]);

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Pay you want to take home" hint="Your salary for the year, before taxes.">
          <SliderInput value={salary} onChange={setSalary} min={20000} max={250000} step={1000} suffix="$/yr" ariaLabel="Desired annual salary" />
        </Field>
        <Field
          label="Yearly business overhead"
          hint="Insurance, truck, fuel, tools, phone, software — everything it costs to exist."
        >
          <SliderInput value={overhead} onChange={setOverhead} min={0} max={150000} step={500} suffix="$/yr" ariaLabel="Yearly overhead" />
        </Field>
        <Field label="Profit margin" hint="What's left to grow the business. 10% is a healthy floor.">
          <SliderInput value={margin} onChange={setMargin} min={0} max={50} step={1} suffix="%" ariaLabel="Profit margin percent" />
        </Field>
        <Field label="Billable hours per week" hint="Wrench time — not driving, quoting, or paperwork. Be honest.">
          <SliderInput value={hrsWeek} onChange={setHrsWeek} min={5} max={60} step={1} suffix="hrs" ariaLabel="Billable hours per week" />
        </Field>
        <Field label="Working weeks per year" hint="52 minus vacation, holidays, and slow weeks.">
          <SliderInput value={weeks} onChange={setWeeks} min={20} max={52} step={1} suffix="wks" ariaLabel="Working weeks per year" />
        </Field>
      </div>

      {result ? (
        <div className="mt-2">
          <RateScene salary={result.salary} overhead={result.overhead} profit={result.profit} target={result.target} rate={result.rate} />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Your hourly rate"
              value={`$${fmt(result.rate)}/hr`}
              sub="Charge this or the math doesn't work"
              highlight
            />
            <Stat label="Day rate" value={`$${fmt(result.day)}`} sub="8 hours at your rate" />
            <Stat
              label="Revenue target"
              value={`$${fmt(result.target)}`}
              sub={`${fmt(result.hours, 0)} billable hours/yr covers $${fmt(result.costs)} in costs + profit`}
            />
          </div>

          {/* Where the money goes */}
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-bone-500">Where every dollar goes</p>
            <div className="mt-2 flex h-12 overflow-hidden rounded-xl border border-ink-600">
              <div
                className="flex items-center justify-center bg-safety-500/80 text-xs font-extrabold text-ink-950 transition-all duration-300"
                style={{ width: `${(result.salary / result.target) * 100}%` }}
              >
                {result.salary / result.target > 0.18 ? "Your pay" : ""}
              </div>
              <div
                className="flex items-center justify-center bg-ink-600 text-xs font-extrabold text-bone-200 transition-all duration-300"
                style={{ width: `${(result.overhead / result.target) * 100}%` }}
              >
                {result.overhead / result.target > 0.18 ? "Overhead" : ""}
              </div>
              <div
                className="flex items-center justify-center bg-ember-600/90 text-xs font-extrabold text-paper transition-all duration-300"
                style={{ width: `${(result.profit / result.target) * 100}%` }}
              >
                {result.profit / result.target > 0.12 ? "Profit" : ""}
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-xs">
              <p className="text-bone-400">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-safety-500/80 align-middle" />
                Pay <span className="font-bold text-paper">${fmt(result.salary, 0)}</span>
              </p>
              <p className="text-bone-400">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-ink-600 align-middle" />
                Overhead <span className="font-bold text-paper">${fmt(result.overhead, 0)}</span>
              </p>
              <p className="text-bone-400">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-ember-600/90 align-middle" />
                Profit <span className="font-bold text-paper">${fmt(result.profit, 0)}</span>
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-bone-500">
            The trap most shops fall into: 40 hours worked is not 40 hours billed. If only 30 of your 40 hours are
            billable, your rate has to carry the other 10. That&apos;s what this math does.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-bone-500">Enter your numbers to find your rate.</p>
      )}
    </div>
  );
}
