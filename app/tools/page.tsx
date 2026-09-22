import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Calculators for the Trades",
  description:
    "Free trade calculators: conduit bending, BTU/AC sizing, water heater sizing, concrete, and contractor hourly rate. No signup, no paywall — from TradeReady.",
};

type Tool = { href: string; name: string; blurb: string; tag: string };

const GROUPS: { trade: string; tools: Tool[] }[] = [
  {
    trade: "Electrical",
    tools: [
      {
        href: "/tools/electrical/conduit-bending-calculator",
        name: "Conduit bending calculator",
        blurb: "Offset mark spacing, multipliers, and shrinkage for 10°–45° bends, plus 90° stub-up take-up.",
        tag: "Most used",
      },
    ],
  },
  {
    trade: "HVAC",
    tools: [
      {
        href: "/tools/hvac/btu-calculator",
        name: "BTU calculator",
        blurb: "What size AC do you need? Cooling load in BTU/hr and tons from square footage, climate, and insulation.",
        tag: "Homeowner favorite",
      },
    ],
  },
  {
    trade: "Plumbing",
    tools: [
      {
        href: "/tools/plumbing/water-heater-sizing-calculator",
        name: "Water heater sizing calculator",
        blurb: "Tank gallons or tankless GPM, sized from the household's busiest hour — not guesswork.",
        tag: "Pro pick",
      },
    ],
  },
  {
    trade: "General",
    tools: [
      {
        href: "/tools/general/concrete-calculator",
        name: "Concrete calculator",
        blurb: "Cubic yards to order or bags to buy for any slab, patio, or driveway — waste included.",
        tag: "DIY favorite",
      },
    ],
  },
  {
    trade: "Business",
    tools: [
      {
        href: "/tools/business/hourly-rate-calculator",
        name: "Hourly rate calculator",
        blurb: "The rate that covers your pay, overhead, and profit — from your real billable hours.",
        tag: "Shop essential",
      },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-bone-500">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="transition hover:text-paper">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-bone-300">
            Free tools
          </li>
        </ol>
      </nav>

      <div className="mt-6 text-center">
        <span className="kicker">Free forever · No signup</span>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-5xl uppercase leading-[0.95] tracking-wide text-paper sm:text-6xl">
          Calculators for the <span className="text-safety-400">trades.</span>
        </h1>
        <div className="hazard mx-auto mt-6 h-2 w-40 rounded-full" aria-hidden="true" />
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-bone-300">
          The math you do on the job, done right and done fast. Every tool shows
          its working, so you can trust the number — and every one is free, no
          account needed.
        </p>
      </div>

      <div className="mt-12 space-y-10">
        {GROUPS.map((g) => (
          <section key={g.trade} aria-label={`${g.trade} tools`}>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl uppercase tracking-wide text-paper">{g.trade}</h2>
              <div className="h-px flex-1 bg-ink-700" aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.tools.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="card group relative overflow-hidden p-6 transition hover:border-safety-500/40"
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-safety-400 to-ember-600"
                    aria-hidden="true"
                  />
                  <span className="inline-block rounded-full border border-safety-500/40 bg-safety-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-safety-300">
                    {t.tag}
                  </span>
                  <h3 className="mt-3 font-display text-xl uppercase tracking-wide text-paper transition group-hover:text-safety-300">
                    {t.name}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-bone-300">{t.blurb}</p>
                  <p className="mt-4 text-sm font-bold text-safety-300">Open calculator →</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="card mt-14 p-6 sm:p-10" aria-label="Why these are free">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl uppercase tracking-wide text-paper">Why free?</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
              Because the best advertising is being useful. These calculators are
              the same math our quote builder uses — we&apos;d rather you trust
              the numbers here first, then trust us with your business.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl uppercase tracking-wide text-paper">What&apos;s next?</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
              When the number becomes a job, TradeReady turns it into a quote,
              gets it approved by text, converts it to an invoice, and finds the
              work you forgot to bill. The office manager in your pocket.
            </p>
            <Link
              href="/signup"
              className="btn-primary mt-5 inline-flex font-display text-lg uppercase tracking-wider"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
