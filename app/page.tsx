import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "TradeReady — Your office manager, in your pocket",
  description:
    "TradeReady runs the full job lifecycle for trades professionals: quote it, invoice it, get paid, get reviewed, win the next one. Built for plumbers, electricians, HVAC, GCs, and more.",
};

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-6">
      <p className="font-display text-3xl font-bold text-amber-400">{n}</p>
      <h3 className="mt-3 font-display text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

function Feature({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="card p-6">
      <h3 className="font-display text-base font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center md:pt-28">
        <span className="section-label">Built for the trades</span>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
          Your office manager,{" "}
          <span className="gradient-text">in your pocket.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
          You&apos;re good at the work. The paperwork is what eats your evenings.
          TradeReady runs the whole job — quote it, invoice it, get paid, get
          reviewed, win the next one — from your phone, between jobs.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/signup" className="btn-primary text-base">
            Get started free
          </Link>
          <Link href="#how-it-works" className="btn-secondary text-base">
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          No credit card. Your data stays yours.
        </p>
      </section>

      {/* LIFECYCLE */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
        <h2 className="text-center font-display text-3xl font-bold text-white">
          One job, start to finish
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">
          Every job follows the same path. TradeReady walks it with you — and
          makes sure nothing falls through the cracks.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Step
            n="1"
            title="Quote it in minutes"
            body="Describe the job in plain words — the AI drafts professional line items with labor and materials split and realistic pricing. You review, adjust, and send a branded PDF before you leave the driveway."
          />
          <Step
            n="2"
            title="Never chase blindly"
            body="Quotes sitting unanswered for 2+ days land in your follow-up queue with a ready-to-send nudge drafted for you. Copy, paste, text. Jobs stop going quiet."
          />
          <Step
            n="3"
            title="Invoice in one tap"
            body="Accepted a quote? Turn it into an invoice with one click. Set the due date, send the PDF, and watch the money come in instead of wondering who still owes you."
          />
          <Step
            n="4"
            title="Get paid on time"
            body="Overdue invoices surface automatically with a firm-but-polite reminder drafted for you. No more awkward phone calls you keep putting off."
          />
          <Step
            n="5"
            title="Collect reviews"
            body="Finish a job, and TradeReady reminds you to ask for the review — with the message already written. Reviews are how the next customer finds you."
          />
          <Step
            n="6"
            title="Win the repeat"
            body="Every customer keeps a full history: past jobs, what you installed and when, notes that matter. When that 9-year-old water heater dies, you're the one who calls — not the other guy."
          />
        </div>
      </section>

      {/* MORNING BRIEFING */}
      <section className="border-y border-white/10 bg-black/30">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="section-label">The daily habit</span>
              <h2 className="mt-4 font-display text-3xl font-bold text-white">
                Open it with your coffee. Know your whole day.
              </h2>
              <p className="mt-4 leading-relaxed text-slate-400">
                The morning briefing is the screen you open every day: quotes
                waiting on follow-up, invoices past due, today&apos;s jobs, and
                reviews you still need to ask for. Everything that needs your
                attention, in one glance — before the first truck rolls.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex gap-3">
                  <span className="text-amber-400">▸</span>
                  Stale quotes flagged after 2 days of silence
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-400">▸</span>
                  Overdue invoices with one-tap reminder drafts
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-400">▸</span>
                  Today&apos;s schedule, front and center
                </li>
                <li className="flex gap-3">
                  <span className="text-amber-400">▸</span>
                  Completed jobs still missing a review ask
                </li>
              </ul>
            </div>
            <div className="card p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Tuesday morning briefing
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
                  <p className="text-sm font-semibold text-white">2 quotes need follow-up</p>
                  <p className="mt-1 text-xs text-slate-400">Miller water heater · sent 4 days ago</p>
                </div>
                <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-4">
                  <p className="text-sm font-semibold text-white">1 invoice overdue</p>
                  <p className="mt-1 text-xs text-slate-400">INV-118 · $1,240 · 6 days past due</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-sm font-semibold text-white">3 jobs today</p>
                  <p className="mt-1 text-xs text-slate-400">First starts 8:00 AM — panel upgrade, Oak St</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-sm font-semibold text-white">1 review to ask for</p>
                  <p className="mt-1 text-xs text-slate-400">Thursday&apos;s repipe went great — ask the Johnsons</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">
                Illustrative example of the briefing layout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
        <h2 className="text-center font-display text-3xl font-bold text-white">
          Everything the office used to do
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="AI quote drafting"
            body="Talk like you talk. The AI turns 'replace the water heater, haul the old one away' into a professional line-item quote with labor and materials priced."
          />
          <Feature
            title="Branded quote & invoice PDFs"
            body="Your business name, your trade, your phone number — on every document. Look like the outfit you are, not a guy with a notebook."
          />
          <Feature
            title="Customer history that wins repeats"
            body="Every job, every invoice, every install logged per customer. Know what you put in and when — and be first in line when it needs replacing."
          />
          <Feature
            title="Schedule that feeds the briefing"
            body="Jobs on a calendar, statuses from scheduled to complete. What matters today shows up in your morning briefing automatically."
          />
          <Feature
            title="Review engine"
            body="After a great job, get the ask drafted and logged. Track who's been asked and who's delivered — and watch the stars stack up."
          />
          <Feature
            title="Your data, your business"
            body="Every quote, customer, and dollar is scoped to your account. Export your documents as PDF anytime. Nothing is shared, sold, or used to train anything."
          />
        </div>
      </section>

      {/* TRADES */}
      <section className="border-y border-white/10 bg-black/30">
        <div className="mx-auto max-w-6xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold text-white">
            Made for your trade
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Plumbing, electrical, HVAC, general contracting, roofing, landscaping,
            painting, carpentry — if you quote it, invoice it, and stand behind
            it, TradeReady fits.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Plumbing", "Electrical", "HVAC", "General contracting", "Roofing", "Landscaping", "Painting", "Carpentry"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-16">
        <h2 className="text-center font-display text-3xl font-bold text-white">Straight answers</h2>
        <div className="mt-10 space-y-4">
          {[
            {
              q: "Is this replacing my accountant?",
              a: "No. TradeReady runs your day-to-day — quotes, invoices, scheduling, follow-ups. Your accountant still does your taxes. This just makes sure there's clean paperwork to hand them.",
            },
            {
              q: "Does it send texts or emails for me?",
              a: "No. It drafts the follow-up, reminder, and review messages — you copy them into your own texts. Nothing goes out without you reading it first.",
            },
            {
              q: "What does the AI actually do?",
              a: "Three things: drafts quote line items from your plain-words description, drafts follow-up and reminder messages, and drafts review requests. Every number and every word is yours to review before it goes anywhere.",
            },
            {
              q: "What happens to my data?",
              a: "It's yours. Your customers, quotes, and invoices are scoped to your account, never shared or sold, and you can download your documents as PDF anytime.",
            },
            {
              q: "I'm not great with computers. Is this for me?",
              a: "If you can text, you can use TradeReady. Describe the job like you'd tell a buddy, tap save, done. That's the whole learning curve.",
            },
          ].map((f) => (
            <div key={f.q} className="card p-6">
              <h3 className="font-display text-base font-bold text-white">{f.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-8 text-center">
        <div className="card p-10 md:p-16">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold text-white md:text-4xl">
            Stop doing paperwork at 10 PM.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Quote from the driveway. Invoice from the truck. Know your morning
            before it starts. Get set up in five minutes.
          </p>
          <Link href="/signup" className="btn-primary mt-8 text-base">
            Get started free
          </Link>
        </div>
      </section>
    </div>
  );
}
