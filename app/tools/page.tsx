import type { Metadata } from "next";
import Link from "next/link";
import { IconCheck, IconQuote, IconWrench } from "@/components/icons";
import { ToolCard } from "@/components/tools/ToolCard";
import { siteName, siteUrl } from "@/lib/site";
import { TOOLS, toolsByTrade } from "@/lib/tools";

export const metadata: Metadata = {
  title: "Free Calculators for the Trades",
  description:
    "Free trade calculators: voltage drop, wire ampacity, conduit bending, box fill, Ohm's law, AC and furnace BTU sizing, water heater sizing, concrete, and contractor hourly rate. No signup, no paywall — from TradeReady.",
  alternates: { canonical: "/tools" },
};

const STEPS = [
  {
    n: "01",
    title: "Enter the numbers",
    body: "Load, distance, square footage, hours — whatever the job gives you. Big inputs, glove-friendly, on your phone.",
    Icon: IconWrench,
  },
  {
    n: "02",
    title: "See the working",
    body: "Every result comes with the formula and the standard it follows, so you can check it — or explain it to the customer.",
    Icon: IconCheck,
  },
  {
    n: "03",
    title: "Turn it into a quote",
    body: "One tap drops the numbers into a TradeReady quote draft. Calculate now, sign in whenever — the result waits for you.",
    Icon: IconQuote,
  },
];

export default function ToolsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Free calculators for the trades",
    numberOfItems: TOOLS.length,
    itemListElement: TOOLS.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      url: `${siteUrl}${t.href}`,
    })),
    provider: { "@type": "Organization", name: siteName, url: siteUrl },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
        <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Trades covered">
          {toolsByTrade().map((g) => (
            <li key={g.trade}>
              <a
                href={`#${g.trade}`}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full border-2 border-ink-600 bg-ink-800 px-4 text-sm font-bold text-bone-200 transition hover:border-safety-500/50 hover:text-safety-300"
              >
                {g.label}
                <span className="rounded-full bg-ink-950 px-2 py-0.5 text-[11px] text-bone-500">{g.tools.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 space-y-12">
        {toolsByTrade().map((g) => (
          <section key={g.trade} id={g.trade} className="scroll-mt-24" aria-label={`${g.label} calculators`}>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
                {g.label}
                <span className="ml-3 text-base text-bone-500">
                  {g.tools.length} {g.tools.length === 1 ? "tool" : "tools"}
                </span>
              </h2>
              <div className="mb-2 h-px flex-1 bg-ink-700" aria-hidden="true" />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.tools.map((t) => (
                <ToolCard key={t.href} tool={t} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-14" aria-label="How every tool works">
        <div className="text-center">
          <span className="kicker">How every tool works</span>
          <h2 className="mt-4 font-display text-3xl uppercase tracking-wide text-paper md:text-4xl">
            From the number to the job
          </h2>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card relative overflow-hidden p-6">
              <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-safety-400 to-ember-600" aria-hidden="true" />
              <div className="flex items-start justify-between gap-4">
                <p className="font-display text-4xl leading-none text-safety-400/90">{s.n}</p>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-900 text-bone-300">
                  <s.Icon className="h-5 w-5" />
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl uppercase tracking-wide text-paper">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-bone-300">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card mt-14 overflow-hidden p-6 sm:p-10" aria-label="Why these are free">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl uppercase tracking-wide text-paper">Why free?</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
              Because the best advertising is being useful. These calculators are
              the same math our quote builder uses — we&apos;d rather you trust
              the numbers here first, then trust us with your business.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
              No email gate, no &ldquo;pro&rdquo; tier, no watermark on the result.
              Use them as often as you like.
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
            <p className="mt-3 text-xs text-bone-500">No credit card. Your data stays yours.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
