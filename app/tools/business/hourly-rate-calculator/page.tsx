import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import HourlyRate from "@/components/tools/calculators/HourlyRate";

export const metadata: Metadata = {
  title: "Hourly Rate Calculator for Contractors — What Should I Charge?",
  description:
    "Free contractor hourly rate calculator: enter your target pay, overhead, profit margin, and real billable hours to find the hourly rate your business actually needs.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Business"
      tradeHref="/tools"
      title="Contractor hourly rate calculator"
      lede="The rate that covers your pay, your overhead, and your profit — computed from your real billable hours, not the 40-hour fantasy. If the number surprises you, that's the point."
      mathTitle="How the math works"
      mathSteps={[
        "Start with your target pay, then add the taxes and benefits that ride on it: self-employment tax is 15.3% of net on its own, before health insurance or retirement. This is the cost most one-truck shops forget, and it is why a $75,000 salary costs the business closer to $86,000.",
        "Add your yearly business overhead — insurance, truck, fuel, tools, phone, software, everything it costs for the business to exist.",
        "Apply the profit margin as a share of revenue, not a markup on cost: revenue = costs ÷ (1 − margin). A 10% margin is an 11.1% markup. Charging 10% on top of costs and calling it a 10% margin quietly leaves you a point short.",
        "Divide by your real annual billable hours: billable hours per week × working weeks per year. Wrench time only — not driving, quoting, or paperwork.",
        "The result is the minimum sustainable hourly rate. Day rate is just 8× the hourly rate.",
      ]}
      mathNote="The step most shops skip is honest billable hours. If you work 40 hours but only 25 are billable, your rate must be 60% higher than the 40-hour math suggests. Underestimating billable hours is the #1 reason contractors stay busy and broke."
      faqs={[
        {
          q: "What should I charge per hour as a contractor?",
          a: "It depends on your costs, not your competitor's price — but most one-person shops land between $75 and $150/hr once they count real overhead and real billable hours. Run your own numbers above; copying someone else's rate with different costs is how businesses quietly go under.",
        },
        {
          q: "How many billable hours does a contractor really have?",
          a: "Most field contractors bill 25–32 hours of a 40-hour week. The rest goes to driving, quoting, material runs, callbacks, and paperwork. Use your honest number — inflating it just produces a rate that doesn't cover reality.",
        },
        {
          q: "Should I charge hourly or flat rate?",
          a: "Flat rate usually wins: customers prefer knowing the price upfront, and you keep the upside when you're efficient. But flat-rate quotes should still be built from your hourly rate × estimated hours + materials + margin — which is exactly what this calculator gives you the foundation for.",
        },
        {
          q: "What profit margin should a contractor aim for?",
          a: "10% net profit is a solid floor for a small shop; 15–20% is healthy. Below 10% and one bad job or slow month wipes out the year. Profit isn't greed — it's the fund that buys the next truck and survives January.",
        },
      ]}
      related={[
        {
          href: "/tools/electrical/voltage-drop-calculator",
          name: "Voltage drop",
          blurb: "Wire size for long runs — keep the drop under 3%.",
        },
        {
          href: "/tools/hvac/btu-calculator",
          name: "BTU calculator",
          blurb: "Size an AC or furnace from square footage, climate, and insulation.",
        },
        {
          href: "/tools/general/concrete-calculator",
          name: "Concrete calculator",
          blurb: "Cubic yards to order or bags to buy for any slab.",
        },
      ]}
      ctaTitle="Found your rate. Now use it on every quote."
      ctaBody="Save your rate in TradeReady and build quotes from it in seconds — line items, tax, customer approval link, invoice, and payment tracking, all in your pocket."
    >
      <HourlyRate />
    </ToolLayout>
  );
}
