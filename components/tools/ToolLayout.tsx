import Link from "next/link";
import type { ReactNode } from "react";

export type Faq = { q: string; a: string };
export type RelatedTool = { href: string; name: string; blurb: string };

export function ToolLayout({
  trade,
  tradeHref,
  title,
  lede,
  children,
  mathTitle,
  mathSteps,
  mathNote,
  faqs,
  related,
  ctaTitle,
  ctaBody,
}: {
  trade: string;
  tradeHref: string;
  title: string;
  lede: string;
  children: ReactNode;
  mathTitle: string;
  mathSteps: string[];
  mathNote?: string;
  faqs: Faq[];
  related: RelatedTool[];
  ctaTitle: string;
  ctaBody: string;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-bone-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="transition hover:text-paper">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/tools" className="transition hover:text-paper">
              Free tools
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={tradeHref} className="transition hover:text-paper">
              {trade}
            </Link>
          </li>
        </ol>
      </nav>

      <span className="kicker mt-6 inline-block">Free tool · {trade}</span>
      <h1 className="mt-4 font-display text-4xl uppercase leading-[1.02] tracking-wide text-paper sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-bone-300">{lede}</p>

      {/* Calculator */}
      <div className="card mt-8 p-5 sm:p-8">{children}</div>

      {/* The math */}
      <section className="card mt-6 p-5 sm:p-8" aria-label="How the math works">
        <h2 className="font-display text-2xl uppercase tracking-wide text-paper">{mathTitle}</h2>
        <ol className="mt-4 space-y-3">
          {mathSteps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-bone-300">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-safety-500/15 font-display text-sm text-safety-300">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        {mathNote ? <p className="mt-4 text-sm leading-relaxed text-bone-500">{mathNote}</p> : null}
      </section>

      {/* FAQ */}
      <section className="mt-6" aria-label="Frequently asked questions">
        <h2 className="font-display text-2xl uppercase tracking-wide text-paper">Common questions</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="card group p-5">
              <summary className="cursor-pointer list-none text-[15px] font-bold text-paper transition group-hover:text-safety-300 [&::-webkit-details-marker]:hidden">
                <span className="mr-2 inline-block text-safety-400 transition group-open:rotate-90">▸</span>
                {f.q}
              </summary>
              <p className="mt-3 text-[15px] leading-relaxed text-bone-300">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related tools */}
      <section className="mt-10" aria-label="More free tools">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl uppercase tracking-wide text-paper">More free tools</h2>
          <Link href="/tools" className="shrink-0 text-sm font-bold text-safety-300 transition hover:text-safety-200">
            View all →
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {related.map((r) => (
            <Link key={r.href} href={r.href} className="card group p-5 transition hover:border-safety-500/40">
              <h3 className="font-display text-lg uppercase tracking-wide text-paper transition group-hover:text-safety-300">
                {r.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-bone-400">{r.blurb}</p>
              <p className="mt-3 text-sm font-bold text-safety-300">Open tool →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card mt-10 overflow-hidden p-6 text-center sm:p-10" aria-label="Try TradeReady">
        <div className="hazard mx-auto h-2 w-32 rounded-full" aria-hidden="true" />
        <h2 className="mx-auto mt-5 max-w-xl font-display text-3xl uppercase tracking-wide text-paper">
          {ctaTitle}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-bone-300">{ctaBody}</p>
        <Link
          href="/signup"
          className="btn-primary mt-6 inline-flex font-display text-lg uppercase tracking-wider"
        >
          Get started
        </Link>
        <p className="mt-3 text-xs text-bone-500">Your data stays yours.</p>
      </section>
    </div>
  );
}
