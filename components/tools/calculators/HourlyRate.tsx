"use client";

import { useMemo, useState } from "react";
import { Field, NumInput, Stat, fmt } from "../ui";

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
    const target = (s + o) * (1 + m / 100);
    const hours = h * w;
    const rate = target / hours;
    return { target, hours, rate, day: rate * 8, costs: s + o };
  }, [salary, overhead, margin, hrsWeek, weeks]);

  return (
    <div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Pay you want to take home" hint="Your salary for the year, before taxes.">
          <NumInput value={salary} onChange={setSalary} min={0} suffix="$/yr" ariaLabel="Desired annual salary" />
        </Field>
        <Field
          label="Yearly business overhead"
          hint="Insurance, truck, fuel, tools, phone, software — everything it costs to exist."
        >
          <NumInput value={overhead} onChange={setOverhead} min={0} suffix="$/yr" ariaLabel="Yearly overhead" />
        </Field>
        <Field label="Profit margin" hint="What's left to grow the business. 10% is a healthy floor.">
          <NumInput value={margin} onChange={setMargin} min={0} max={100} suffix="%" ariaLabel="Profit margin percent" />
        </Field>
        <Field label="Billable hours per week" hint="Wrench time — not driving, quoting, or paperwork. Be honest.">
          <NumInput value={hrsWeek} onChange={setHrsWeek} min={1} max={80} suffix="hrs" ariaLabel="Billable hours per week" />
        </Field>
        <Field label="Working weeks per year" hint="52 minus vacation, holidays, and slow weeks.">
          <NumInput value={weeks} onChange={setWeeks} min={1} max={52} step="1" ariaLabel="Working weeks per year" />
        </Field>
      </div>

      {result ? (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-3">
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
