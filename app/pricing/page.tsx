import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck, IconMoneyFound, IconX } from "@/components/icons";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "TradeReady is free. Every feature, no limits, no card — including the screens that find money in records you already have.",
};

/**
 * Pricing — free, and honest about why.
 *
 * There is no paid tier and no trial to expire, so this page says exactly
 * that. Advertising a plan that nothing enforces would be a promise the app
 * can't keep, and the first thing a contractor would find out is that the
 * product lied on the way in.
 *
 * When a paid tier does exist, it gets added here as a real thing with a
 * real checkout — not as copy written ahead of the code.
 */

const EVERYTHING = [
  "Unlimited quotes, invoices and customers",
  "AI-drafted quote line items from a plain-words description",
  "Branded PDF quotes and invoices, with your licence number",
  "Share links — your customer accepts with one tap",
  "Money Found — unbilled work, aging installs, quiet customers, old declines",
  "Win rate by price band, with the sample size on every figure",
  "AI follow-ups, payment reminders, review requests and reactivation texts",
  "Customer history, equipment records and the job schedule",
  "The morning briefing",
];

const NOT_YET = [
  "Sending texts or emails for you — it drafts, you send",
  "Card payments and deposits",
  "Team accounts — one login per business",
  "Payroll, taxes or bookkeeping",
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
      <div className="text-center">
        <span className="kicker justify-center">Pricing</span>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-5xl uppercase leading-[1.03] tracking-wide text-paper md:text-7xl">
          It&apos;s <span className="text-safety-400">free.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-bone-300">
          All of it. Every feature, no limits, no trial counting down, no card.
          TradeReady is new and what it needs right now is contractors using it
          and telling us where it falls short — not your money.
        </p>
      </div>

      <div className="card mt-12 overflow-hidden">
        <div className="hazard h-2" aria-hidden="true" />
        <div className="p-7 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="stat-label">Everything, forever</p>
              <p className="mt-2 font-display text-7xl leading-none tracking-wide text-safety-300">
                $0
              </p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-money-400/15 text-money-300">
              <IconMoneyFound className="h-7 w-7" />
            </span>
          </div>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {EVERYTHING.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-money-400/20 text-money-300">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <span className="text-[15px] leading-relaxed text-bone-200">
                  {f}
                </span>
              </li>
            ))}
          </ul>

          <Link href="/signup" className="btn-primary mt-9 w-full font-display text-xl uppercase tracking-wider sm:!min-h-[60px]">
            Start using it
          </Link>
          <p className="mt-3 text-center text-sm text-bone-500">
            No card, no sales call, no trial timer.
          </p>
        </div>
      </div>

      <div className="card mt-6 p-7 sm:p-8">
        <h2 className="font-display text-xl uppercase tracking-wide text-paper">
          What it doesn&apos;t do
        </h2>
        <p className="mt-2 text-[15px] text-bone-400">
          Worth knowing before you sign up, not after.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {NOT_YET.map((x) => (
            <li key={x} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-700 text-bone-500">
                <IconX className="h-3 w-3" />
              </span>
              <span className="text-[15px] leading-relaxed text-bone-300">{x}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 space-y-4">
        {[
          {
            q: "What's the catch?",
            a: "There isn't one yet, and that's the honest answer. TradeReady is early. It's more useful to us to have contractors running real jobs through it than to have a handful paying for something that hasn't been tested on real work.",
          },
          {
            q: "Will you start charging later?",
            a: "Probably, for something — most likely the screens that read your records back to you. If that happens you'll get plenty of notice, and everything you've already put in stays yours either way. Nothing you enter gets held hostage.",
          },
          {
            q: "Do you sell my data?",
            a: "No. Your customers, quotes and invoices are scoped to your account and aren't shared or sold. You can download any document as a PDF, and you can delete the whole account from Settings, which removes everything immediately.",
          },
          {
            q: "Is the AI free too?",
            a: "Yes. There are generous hourly caps on the drafting features so one automated script can't run up the bill for everyone, but they're set well above what real use looks like — you'd have to be trying to hit them.",
          },
        ].map((f) => (
          <div key={f.q} className="card p-6">
            <h3 className="font-display text-lg uppercase tracking-wide text-paper">
              {f.q}
            </h3>
            <p className="mt-2 text-[15px] leading-relaxed text-bone-300">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
