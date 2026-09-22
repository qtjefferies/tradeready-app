"use client";

import type { ReactNode } from "react";

/** Nearest-eighth fractional inches, e.g. 12.375 -> `12 3/8"`. Built for the shop. */
export function toFraction(inches: number): string {
  if (!isFinite(inches)) return "—";
  const neg = inches < 0;
  const abs = Math.abs(inches);
  const whole = Math.floor(abs);
  const eighths = Math.round((abs - whole) * 8);
  let w = whole;
  let e = eighths;
  if (e === 8) {
    w += 1;
    e = 0;
  }
  const frac = e === 0 ? "" : e % 2 === 0 ? (e % 4 === 0 ? "1/2" : `${e / 2}/4`) : `${e}/8`;
  const body = w === 0 ? (frac === "" ? "0" : frac) : frac === "" ? `${w}` : `${w} ${frac}`;
  return `${neg ? "-" : ""}${body}"`;
}

export function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label-dark">{label}</label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-bone-500">{hint}</p> : null}
    </div>
  );
}

export function NumInput({
  value,
  onChange,
  min,
  max,
  step = "any",
  suffix,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: string;
  suffix?: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        className={`input-dark w-full ${suffix ? "pr-12" : ""}`}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(e.target.value)}
      />
      {suffix ? (
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-bone-500">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] rounded-xl border px-4 py-2 text-sm font-bold transition ${
              active
                ? "border-safety-400 bg-safety-500/20 text-safety-300 shadow-glow"
                : "border-ink-600 bg-ink-900 text-bone-400 hover:border-bone-500 hover:text-paper"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-3 transition hover:border-bone-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 accent-amber-400"
      />
      <span>
        <span className="block text-sm font-bold text-paper">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-bone-500">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-safety-500/50 bg-safety-500/10" : "border-ink-600 bg-ink-900"
      }`}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bone-500">{label}</p>
      <p className={`mt-1.5 font-display text-3xl tracking-wide ${highlight ? "text-safety-300" : "text-paper"}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs leading-relaxed text-bone-500">{sub}</p> : null}
    </div>
  );
}
