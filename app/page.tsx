import type { Metadata } from "next";
import Link from "next/link";
import { BriefingPreview } from "@/components/BriefingPreview";
import {
  IconCheck,
  IconClock,
  IconCustomers,
  IconDollar,
  IconInvoice,
  IconQuote,
  IconReviews,
  IconSchedule,
  IconWrench,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "TradeReady — Your office manager, in your pocket",
  description:
    "TradeReady runs the full job lifecycle for trades professionals: quote it, invoice it, get paid, get reviewed, win the next one. Built for plumbers, electricians, HVAC, GCs, and more.",
};

function Step({
  n,
  title,
  body,
  Icon,
}: {
  n: string;
  title: string;
  body: string;
  Icon: (p: { className?: string }) => JSX.Element;
}) {
  return (
    <div className="card group relative overflow-hidden p-6 transition hover:border-safety-500/40 sm:p-7">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-safety-400 to-ember-600" aria-hidden="true" />
      <div className="flex items-start justify-between gap-4">
        <p className="font-display text-5xl leading-none text-safety-400/90">{n}</p>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-ink-600 bg-ink-900 text-bone-300 transition group-hover:border-safety-500/50 group-hover:text-safety-300">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <h3 className="mt-4 font-display text-xl uppercase tracking-wide text-paper">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-bone-300">{body}</p>
    </div>
  );
}

function Feature({
  title,
  body,
  Icon,
}: {
  title: string;
  body: string;
  Icon: (p: { className?: string }) => JSX.Element;
}) {
  return (
    <div className="card p-6 transition hover:border-safety-500/40">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-safety-500/15 text-safety-300">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-display text-lg uppercase tracking-wide text-paper">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-bone-300">{body}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 md:pt-24">
          <span className="kicker">Built for the trades</span>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-[13vw] uppercase leading-[0.95] tracking-wide text-paper sm:text-6xl md:text-7xl">
            Your office manager,{" "}
            <span className="text-safety-400">in your pocket.</span>
          </h1>
          <div className="hazard mx-auto mt-8 h-2 w-40 rounded-full" aria-hidden="true" />
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-bone-300">
            Every other trades app is a filing cabinet — somewhere to put the
            quote you already wrote. TradeReady reads your records back to you
            and finds the money in them: work you never invoiced, installs due
            for replacement, customers who quietly stopped calling.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link href="/signup" className="btn-primary font-display text-xl uppercase tracking-wider sm:!min-h-[60px] sm:!px-10">
              Get started
            </Link>
            <Link href="#how-it-works" className="btn-secondary sm:!min-h-[60px]">
              See how it works
            </Link>
          </div>
          <p className="mt-5 text-sm text-bone-500">
            Your data stays yours.
          </p>
        </div>
      </section>

      {/* LIFECYCLE */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="text-center">
          <span className="kicker">The full job lifecycle</span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl uppercase tracking-wide text-paper md:text-5xl">
            One job, start to finish
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-bone-300">
            Every job follows the same path. TradeReady walks it with you — and
            makes sure nothing falls through the cracks.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Step
            n="01"
            title="Quote it in minutes"
            body="Describe the job in plain words — the AI drafts professional line items with labor and materials split and realistic pricing. You review, adjust, and send a branded PDF before you leave the driveway."
            Icon={IconQuote}
          />
          <Step
            n="02"
            title="Never chase blindly"
            body="Quotes sitting unanswered for 2+ days land in your follow-up queue with a ready-to-send nudge drafted for you. Copy, paste, text. Jobs stop going quiet."
            Icon={IconClock}
          />
          <Step
            n="03"
            title="Invoice in one tap"
            body="Accepted a quote? Turn it into an invoice with one click. Set the due date, send the PDF, and watch the money come in instead of wondering who still owes you."
            Icon={IconInvoice}
          />
          <Step
            n="04"
            title="Get paid on time"
            body="Overdue invoices surface automatically with a firm-but-polite reminder drafted for you. No more awkward phone calls you keep putting off."
            Icon={IconDollar}
          />
          <Step
            n="05"
            title="Collect reviews"
            body="Finish a job, and TradeReady reminds you to ask for the review — with the message already written. Reviews are how the next customer finds you."
            Icon={IconReviews}
          />
          <Step
            n="06"
            title="Win the repeat"
            body="Every customer keeps a full history: past jobs, what you installed and when, notes that matter. When that 9-year-old water heater dies, you're the one who calls — not the other guy."
            Icon={IconCustomers}
          />
        </div>
      </section>

      {/* MORNING BRIEFING */}
      <section className="border-y-2 border-ink-700 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="kicker">The daily habit</span>
              <h2 className="mt-4 font-display text-4xl uppercase leading-[1.02] tracking-wide text-paper md:text-5xl">
                Open it with your coffee. Know your whole day.
              </h2>
              <p className="mt-5 leading-relaxed text-bone-300">
                The morning briefing is the screen you open every day: quotes
                waiting on follow-up, invoices past due, today&apos;s jobs, and
                reviews you still need to ask for. Everything that needs your
                attention, in one glance — before the first truck rolls.
              </p>
              <ul className="mt-7 space-y-3.5 text-[15px] text-bone-200">
                {[
                  "Stale quotes flagged after 2 days of silence",
                  "Overdue invoices with one-tap reminder drafts",
                  "Today's schedule, front and center",
                  "Completed jobs still missing a review ask",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-money-400/15 text-money-300">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <BriefingPreview />
          </div>
        </div>
      </section>

      {/* THE EDGE — money found */}
      <section id="money" className="scroll-mt-24 border-y-2 border-ink-700 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="kicker">What nobody else does</span>
              <h2 className="mt-4 font-display text-4xl uppercase leading-[1.03] tracking-wide text-paper md:text-5xl">
                Your next job is already
                <span className="text-safety-400"> in your own records.</span>
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-bone-300">
                You don&apos;t need more leads. You need the ones you already
                earned. TradeReady scans what you&apos;ve entered and puts a
                number on what&apos;s sitting there unclaimed.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  {
                    t: "Work you never invoiced",
                    d: "An accepted quote with no invoice against it. It happens more than anyone admits, and it's the purest money on the list.",
                  },
                  {
                    t: "Installs coming due",
                    d: "That water heater went in eleven years ago. Priced from what you charged on your own past water heater jobs — never a made-up market rate.",
                  },
                  {
                    t: "Customers who went quiet",
                    d: "Three paid jobs, nothing in two years. Worth a text, and it writes the text.",
                  },
                  {
                    t: "Declines worth revisiting",
                    d: "They said no in January on a budget that reset in April.",
                  },
                ].map((x) => (
                  <li key={x.t} className="flex gap-4">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-money-400" aria-hidden="true" />
                    <div>
                      <p className="font-display text-lg uppercase tracking-wide text-paper">
                        {x.t}
                      </p>
                      <p className="mt-1 text-[15px] leading-relaxed text-bone-400">
                        {x.d}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-5">
              <div className="card p-6 sm:p-7">
                <p className="stat-label">Win rate by price</p>
                <h3 className="mt-2 font-display text-2xl uppercase leading-tight tracking-wide text-paper">
                  Find out why you lose the big ones
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
                  Your win rate by price band, the labour rate on jobs you win
                  against jobs you lose, and — because your customers open
                  quotes through a link — whether a lost job was your price or
                  a quote they never read. Those need opposite fixes.
                </p>
              </div>
              <div className="card p-6 sm:p-7">
                <p className="stat-label">Straight numbers</p>
                <h3 className="mt-2 font-display text-2xl uppercase leading-tight tracking-wide text-paper">
                  Every figure shows its working
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
                  Each number says how many of your own jobs it came from. Too
                  few to be meaningful, and it says so instead of printing a
                  percentage you might price against. A tool that flatters you
                  is worth less than no tool.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-20">
        <div className="text-center">
          <span className="kicker">Under the hood</span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl uppercase tracking-wide text-paper md:text-5xl">
            Everything the office used to do
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            title="AI quote drafting"
            body="Talk like you talk. The AI turns 'replace the water heater, haul the old one away' into a professional line-item quote with labor and materials priced."
            Icon={IconWrench}
          />
          <Feature
            title="Branded quote & invoice PDFs"
            body="Your business name, your trade, your phone number — on every document. Look like the outfit you are, not a guy with a notebook."
            Icon={IconInvoice}
          />
          <Feature
            title="Customer history that wins repeats"
            body="Every job, every invoice, every install logged per customer. Know what you put in and when — and be first in line when it needs replacing."
            Icon={IconCustomers}
          />
          <Feature
            title="Schedule that feeds the briefing"
            body="Jobs on a calendar, statuses from scheduled to complete. What matters today shows up in your morning briefing automatically."
            Icon={IconSchedule}
          />
          <Feature
            title="Review engine"
            body="After a great job, get the ask drafted and logged. Track who's been asked and who's delivered — and watch the stars stack up."
            Icon={IconReviews}
          />
          <Feature
            title="Your data, your business"
            body="Every quote, customer, and dollar is scoped to your account. Export your documents as PDF anytime. Nothing is shared, sold, or used to train anything."
            Icon={IconCheck}
          />
        </div>
      </section>

      {/* TRADES */}
      <section className="border-y-2 border-ink-700 bg-ink-900/60">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <span className="kicker">All trades welcome</span>
          <h2 className="mt-4 font-display text-4xl uppercase tracking-wide text-paper md:text-5xl">
            Made for your trade
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-bone-300">
            Plumbing, electrical, HVAC, general contracting, roofing, landscaping,
            painting, carpentry — if you quote it, invoice it, and stand behind
            it, TradeReady fits.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {["Plumbing", "Electrical", "HVAC", "General contracting", "Roofing", "Landscaping", "Painting", "Carpentry"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border-2 border-ink-600 bg-ink-800 px-5 py-2.5 text-sm font-bold text-bone-200"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* FREE TOOLS */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="text-center">
          <span className="kicker">Free forever · No signup</span>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-4xl uppercase tracking-wide text-paper md:text-5xl">
            Free calculators for the trades
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-bone-300">
            The math you do on the job, done right and done fast. Conduit bends,
            BTU sizing, water heaters, concrete, your hourly rate — every one
            free, every one showing its working.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/tools/electrical/voltage-drop-calculator", name: "Voltage drop", blurb: "Wire size for long runs — keep drop under 3%" },
            { href: "/tools/hvac/btu-calculator", name: "BTU calculator", blurb: "What size AC do you need?" },
            { href: "/tools/plumbing/water-heater-sizing-calculator", name: "Water heater sizing", blurb: "Tank gallons or tankless GPM" },
            { href: "/tools/general/concrete-calculator", name: "Concrete calculator", blurb: "Yards to order or bags to buy" },
            { href: "/tools/business/hourly-rate-calculator", name: "Hourly rate calculator", blurb: "The rate your business actually needs" },
            { href: "/tools", name: "View all tools", blurb: "The full free collection →" },
          ].map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="card group p-5 transition hover:border-safety-500/40"
            >
              <h3 className="font-display text-lg uppercase tracking-wide text-paper transition group-hover:text-safety-300">
                {t.name}
              </h3>
              <p className="mt-1.5 text-sm text-bone-400">{t.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-20">
        <div className="text-center">
          <span className="kicker">No fine print</span>
          <h2 className="mt-4 font-display text-4xl uppercase tracking-wide text-paper md:text-5xl">
            Straight answers
          </h2>
        </div>
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
              a: "Five things: drafts quote line items from your plain-words description, writes follow-ups for quotes gone quiet, payment reminders for overdue invoices, review requests after a job, and reactivation messages for past customers worth calling. Every number and every word is yours to review before it goes anywhere.",
            },
            {
              q: "How does it know where my money is?",
              a: "It reads what you've already entered. An accepted quote with no invoice against it is work you may never have billed. A water heater you installed twelve years ago is a replacement call. A customer who paid you three times and hasn't been back in two years is worth a text. Every figure it shows is priced from your own past jobs, and it tells you which ones — where it can't price something honestly, it says so instead of guessing.",
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
              <h3 className="font-display text-lg uppercase tracking-wide text-paper">{f.q}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-bone-300">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6">
        <div className="card overflow-hidden text-center">
          <div className="hazard h-2.5" aria-hidden="true" />
          <div className="p-8 sm:p-12 md:p-16">
            <h2 className="mx-auto max-w-2xl font-display text-4xl uppercase leading-[1.02] tracking-wide text-paper md:text-6xl">
              Stop doing paperwork at <span className="text-safety-400">10 PM.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-bone-300">
              Quote from the driveway. Invoice from the truck. Know your morning
              before it starts. Get set up in five minutes.
            </p>
            <Link href="/signup" className="btn-primary mt-9 font-display text-xl uppercase tracking-wider sm:!min-h-[60px] sm:!px-12">
              Get started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
