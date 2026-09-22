import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import VoltageDrop from "@/components/tools/calculators/VoltageDrop";

export const metadata: Metadata = {
  title: "Voltage Drop Calculator — Wire Size for Long Runs",
  description:
    "Free voltage drop calculator for electricians: find the minimum wire size (AWG/kcmil) that keeps voltage drop under 3% for any run length, load, and voltage. Copper and aluminum, single- and three-phase.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Electrical"
      tradeHref="/tools"
      title="Voltage drop calculator"
      lede="Long run, wrong wire, and the motor at the end sees 108 volts. Enter the load and distance and get the smallest wire size that keeps the drop where it belongs — copper or aluminum, single- or three-phase."
      mathTitle="How the math works"
      mathSteps={[
        "Voltage drop = 2 × K × I × L ÷ CM for single-phase (√3 instead of 2 for three-phase). K is the conductor's resistance: 12.9 for copper, 21.2 for aluminum, in ohms per circular-mil-foot.",
        "I is the load current in amps and L is the one-way distance in feet — the current travels out and back, hence the ×2. CM is the wire's cross-section in circular mils.",
        "Divide the drop by the system voltage for the percentage, and compare it against the NEC 210.19(A) guideline: 3% max on branch circuits, 5% for feeder plus branch combined.",
        "The calculator walks up the standard AWG/kcmil sizes and returns the smallest one that stays at or under your target — that's the wire to buy.",
      ]}
      mathNote="Conductor properties follow NEC Chapter 9, Table 8. This sizes for voltage drop only — always verify the wire's ampacity per NEC 310 and your local code before installing."
      faqs={[
        {
          q: "What is the 3% voltage drop rule?",
          a: "NEC 210.19(A) recommends keeping voltage drop to 3% on branch circuits and 5% for the feeder plus branch combined. It's an informational note rather than a hard requirement, but it's the industry standard — engineers spec it and inspectors expect it.",
        },
        {
          q: "How do you calculate voltage drop?",
          a: "VD = 2 × K × I × L ÷ CM for single-phase, where K is 12.9 for copper or 21.2 for aluminum, I is amps, L is one-way feet, and CM is the wire's circular mils. Three-phase uses √3 instead of 2. Then divide by the system voltage for the percentage.",
        },
        {
          q: "Does aluminum wire need to be bigger than copper?",
          a: "Yes — aluminum's resistance (K = 21.2) is about 64% higher than copper's (K = 12.9), so it typically takes two wire sizes larger to hold the same voltage drop. The calculator handles both; just switch the material.",
        },
        {
          q: "When do I need to upsize wire for voltage drop?",
          a: "Any long run is suspect, and lower voltages suffer first: 100 feet at 20 amps on 12 AWG copper drops about 6.6% at 120V — already over the 3% guideline. As a rule of thumb, check the drop on any 120V run over 100 feet and any run where the load is near the wire's ampacity.",
        },
      ]}
      related={[
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
        {
          href: "/tools/business/hourly-rate-calculator",
          name: "Hourly rate calculator",
          blurb: "Find the rate that actually covers your costs and profit.",
        },
      ]}
      ctaTitle="Sized the wire. Now bill for it."
      ctaBody="TradeReady turns the job into a quote, the quote into an invoice, and finds the work you forgot to bill — the office manager in your pocket."
    >
      <VoltageDrop />
    </ToolLayout>
  );
}
