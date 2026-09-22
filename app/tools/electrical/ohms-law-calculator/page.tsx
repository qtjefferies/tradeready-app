import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import OhmsLaw from "@/components/tools/calculators/OhmsLaw";

export const metadata: Metadata = {
  title: "Ohm's Law Calculator — Volts, Amps, Ohms, Watts",
  description:
    "Free Ohm's law calculator for electricians: enter any two of voltage, current, resistance, and power to solve the other two. Also gives BTU/hr, kWh per hour, and the breaker size after the 80% continuous-load rule.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Electrical"
      tradeHref="/tools"
      title="Ohm's law calculator"
      lede="Know two of volts, amps, ohms, and watts? Get the other two, plus what that load throws off in heat, what it costs per hour, and the breaker it needs once the 80% rule is applied."
      mathTitle="How the math works"
      mathSteps={[
        "Ohm's law: V = I × R. Voltage in volts equals current in amps times resistance in ohms. Rearranged, I = V ÷ R and R = V ÷ I.",
        "Power: P = V × I. Substituting Ohm's law gives the other two forms, P = I² × R and P = V² ÷ R, so any two known values reach all four.",
        "When power and resistance are the givens, take square roots: I = √(P ÷ R) and V = √(P × R).",
        "Heat: 1 watt is 3.412 BTU/hr, so a 1,500 W heater puts out about 5,118 BTU/hr. Energy per hour of runtime is watts ÷ 1,000 in kWh.",
        "Breaker: NEC 210.20(A) requires the overcurrent device to be rated at least 125% of a continuous load, which is the same as amps ÷ 0.8. The result is rounded up to the next standard size in NEC 240.6(A): 15, 20, 30, 40, 50, 60, 70, 80, 100, 125, 150, 200 A.",
      ]}
      mathNote="This is DC / resistive-load math. For motors, transformers, and anything with a power factor below 1, the volt-amps drawn exceed the watts consumed — size conductors and breakers on amps, not watts. Confirm conductor ampacity per NEC 310.16 and with local code."
      faqs={[
        {
          q: "What is the 80% rule for breakers?",
          a: "A standard breaker is only meant to carry 80% of its rating continuously — three hours or more. NEC 210.20(A) says the breaker must be at least 125% of the continuous load, which is the same thing said the other way. A 16 A continuous load needs a 20 A breaker; 16 A is the most you should plan on a 20 A circuit for a water heater, EV charger, or lighting that runs all night.",
        },
        {
          q: "What is the difference between watts and volt-amps (VA)?",
          a: "Watts are real power doing work; volt-amps are what the wires actually carry. For a heater or incandescent lamp they are equal. For a motor or anything with electronics, current and voltage drift out of phase, so VA is higher than watts by the power factor. A 1,000 W motor at 0.8 power factor draws 1,250 VA and the amps that go with it. This calculator assumes a power factor of 1.",
        },
        {
          q: "How many amps does a 1,500 watt heater draw?",
          a: "I = P ÷ V, so 1,500 W ÷ 120 V = 12.5 A. That is under the 16 A continuous limit of a 20 A circuit but over the 12 A limit of a 15 A circuit, which is why two space heaters on one 15 A bedroom circuit trip the breaker.",
        },
        {
          q: "How do I convert watts to BTU per hour?",
          a: "Multiply watts by 3.412. A 5,000 W electric heater is 17,060 BTU/hr; a 1,500 W space heater is 5,118 BTU/hr. It works in reverse too: BTU/hr ÷ 3.412 gives the watts, which is how you size the circuit for an electric furnace or a baseboard run.",
        },
      ]}
      related={[
        {
          href: "/tools/electrical/voltage-drop-calculator",
          name: "Voltage drop calculator",
          blurb: "Smallest wire that keeps the drop under 3% on a long run.",
        },
        {
          href: "/tools/electrical/conduit-bending-calculator",
          name: "Conduit bending calculator",
          blurb: "Offset, saddle, and 90 bend marks for EMT and rigid.",
        },
        {
          href: "/tools/business/hourly-rate-calculator",
          name: "Hourly rate calculator",
          blurb: "Find the rate that actually covers your costs and profit.",
        },
      ]}
      ctaTitle="Solved the circuit. Now bill for it."
      ctaBody="TradeReady turns the job into a quote, the quote into an invoice, and finds the work you forgot to bill — the office manager in your pocket."
    >
      <OhmsLaw />
    </ToolLayout>
  );
}
