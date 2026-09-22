"use client";

import { useMemo } from "react";
import { useUrlState } from "../useUrlState";
import { Field, SliderInput, Stat, fmt } from "../ui";
import { DIM, IsoBox, IsoStage, SAFETY, boxCorners, fitIso } from "../iso";


/**
 * One billable day (8 hours) stacked as pay, overhead and profit, beside a
 * single billable hour at the rate. Heights are to scale, so dragging the
 * margin or the hours visibly moves both blocks.
 */
function RateScene({ salary, taxes, overhead, profit, target, rate }: { salary: number; taxes: number; overhead: number; profit: number; target: number; rate: number }) {
  const W = 480;
  const H = 260;
  const day = rate * 8;
  const unit = day / 10 || 1; // the day is 10 world units tall
  const zPay = (day * (salary / target)) / unit;
  const zTax = (day * (taxes / target)) / unit;
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
    { z: zPay + zTax / 2, show: zTax > 0, text: `Taxes $${fmt((day * taxes) / target, 0)}`, color: "#d9a441" },
    { z: zPay + zTax + zOv / 2, show: zOv > 0, text: `Overhead $${fmt((day * overhead) / target, 0)}`, color: "#c9cdd3" },
    { z: zPay + zTax + zOv + zPr / 2, show: zPr > 0, text: `Profit $${fmt((day * profit) / target, 0)}`, color: "#fb923c" },
  ]
    .filter((x) => x.show)
    .map((x) => ({ ...x, y: lab(x.z).y + 4, x: lab(x.z).x + 10 }));
  for (let i = 1; i < segs.length; i++) segs[i].y = Math.min(segs[i].y, segs[i - 1].y - 15);
  return (
    <IsoStage W={W} H={H} label={`One billable day of ${fmt(day, 0)} dollars split into pay, overhead and profit; one hour at ${fmt(rate)} dollars`}>
      <polygon points={pr.pts([-0.8, -0.8, 0], [hx + bw + 0.8, -0.8, 0], [hx + bw + 0.8, bw + 0.8, 0], [-0.8, bw + 0.8, 0])} fill="#0f1116" />
      {zPay > 0 ? <IsoBox pr={pr} x={0} y={0} z={0} dx={bw} dy={bw} dz={zPay} top="#f5b83d" right="#c98e1f" left="#a87515" stroke="#0a0b0d" /> : null}
      {zTax > 0 ? <IsoBox pr={pr} x={0} y={0} z={zPay} dx={bw} dy={bw} dz={zTax} top="#b8862b" right="#95691c" left="#7a5615" stroke="#0a0b0d" /> : null}
      {zOv > 0 ? <IsoBox pr={pr} x={0} y={0} z={zPay + zTax} dx={bw} dy={bw} dz={zOv} top="#6b7080" right="#565b64" left="#464a52" stroke="#0a0b0d" /> : null}
      {zPr > 0 ? <IsoBox pr={pr} x={0} y={0} z={zPay + zTax + zOv} dx={bw} dy={bw} dz={zPr} top="#f97316" right="#c2410c" left="#9a3412" stroke="#0a0b0d" /> : null}
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
  const [q, set] = useUrlState({ pay: "75000", oh: "18000", tax: "15", m: "10", hrs: "30", wks: "48" });
  const salary = q.pay;
  const overhead = q.oh;
  const taxPct = q.tax;
  const margin = q.m;
  const hrsWeek = q.hrs;
  const weeks = q.wks;
  const setSalary = set("pay");
  const setOverhead = set("oh");
  const setTaxPct = set("tax");
  const setMargin = set("m");
  const setHrsWeek = set("hrs");
  const setWeeks = set("wks");

  const result = useMemo(() => {
    const s = parseFloat(salary) || 0;
    const o = parseFloat(overhead) || 0;
    const tp = Math.max(0, parseFloat(taxPct) || 0);
    const m = Math.min(Math.max(parseFloat(margin) || 0, 0), 90);
    const h = parseFloat(hrsWeek);
    const w = parseFloat(weeks);
    if (!isFinite(h) || h <= 0 || !isFinite(w) || w <= 0) return null;
    // Payroll tax and benefits ride on top of pay: self-employment tax alone
    // is 15.3% of net, and it's the cost most one-truck shops forget.
    const taxes = s * (tp / 100);
    const costs = s + taxes + o;
    // True margin: profit is m% of REVENUE, so revenue = costs ÷ (1 − m).
    // (Applying m% to costs is markup, which understates the target.)
    const target = costs / (1 - m / 100);
    const profit = target - costs;
    const markupPct = costs > 0 ? (profit / costs) * 100 : 0;
    const hours = h * w;
    const rate = target / hours;
    return { target, hours, rate, day: rate * 8, costs, salary: s, taxes, overhead: o, profit, marginPct: m, markupPct };
  }, [salary, overhead, taxPct, margin, hrsWeek, weeks]);

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
        <Field
          label="Payroll tax & benefits on your pay"
          hint="Self-employment tax alone is 15.3%. Add health insurance, retirement, and workers' comp if you carry them. 0 if pay already includes them."
        >
          <SliderInput value={taxPct} onChange={setTaxPct} min={0} max={40} step={1} suffix="%" ariaLabel="Payroll tax and benefits percent" />
        </Field>
        <Field label="Net profit margin" hint="Profit as a share of what you bill — not a markup on costs. 10% is a healthy floor for a trades business.">
          <SliderInput value={margin} onChange={setMargin} min={0} max={40} step={1} suffix="%" ariaLabel="Net profit margin percent" />
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
          <RateScene salary={result.salary} taxes={result.taxes} overhead={result.overhead} profit={result.profit} target={result.target} rate={result.rate} />
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
              value={`$${fmt(result.target, 0)}`}
              sub={`${fmt(result.hours, 0)} billable hrs/yr · $${fmt(result.costs, 0)} costs + ${fmt(result.marginPct, 0)}% margin (a ${fmt(result.markupPct, 1)}% markup on cost)`}
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
                className="flex items-center justify-center bg-safety-700/70 text-xs font-extrabold text-paper transition-all duration-300"
                style={{ width: `${(result.taxes / result.target) * 100}%` }}
              >
                {result.taxes / result.target > 0.12 ? "Taxes" : ""}
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
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <p className="text-bone-400">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-safety-500/80 align-middle" />
                Pay <span className="font-bold text-paper">${fmt(result.salary, 0)}</span>
              </p>
              <p className="text-bone-400">
                <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-safety-700/70 align-middle" />
                Taxes &amp; benefits <span className="font-bold text-paper">${fmt(result.taxes, 0)}</span>
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
