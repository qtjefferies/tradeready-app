import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import BtuCalculator from "@/components/tools/calculators/BtuCalculator";

export const metadata: Metadata = {
  title: "BTU Calculator — What Size AC Do I Need?",
  description:
    "Free BTU calculator: find the right air conditioner size from square footage, ceiling height, climate, insulation, and sun exposure. Instant tons and BTU/hr.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="HVAC"
      tradeHref="/tools"
      title="BTU calculator — what size AC do I need?"
      lede="The most-asked question in HVAC, answered in ten seconds. Enter the space and get the cooling load in BTU/hr and tons — plus the size to actually shop for."
      mathTitle="How the math works"
      mathSteps={[
        "Start with 20 BTU per square foot — the industry's baseline rule of thumb for a moderately insulated space.",
        "Adjust for climate: ×1.25 in hot regions, ×0.85 where summers are mild. Adjust for ceiling height: a 10-foot ceiling holds 25% more air than an 8-foot one.",
        "Adjust for the building: ×0.9 for good insulation, ×1.15 for poor; ×1.1 for full sun, ×0.95 for full shade.",
        "Add 600 BTU/hr for each occupant beyond two, and 4,000 BTU/hr if the zone includes a kitchen.",
        "Divide by 12,000 to get tons, then round UP to the nearest half-ton. An undersized unit runs forever and never catches up; slightly oversized short-cycles, so nearest half-ton up is the sweet spot.",
      ]}
      mathNote="This is a rule-of-thumb estimate for quoting and sanity-checking. Final equipment selection should follow a Manual J load calculation — this gets you in the right half-ton, Manual J picks the exact unit."
      faqs={[
        {
          q: "How many BTU per square foot do I need?",
          a: "About 20 BTU per square foot is the baseline for a moderately insulated space in a moderate climate. Hot climates push it toward 25, good insulation and mild climates pull it toward 15–18. The calculator above adjusts the baseline for your actual conditions.",
        },
        {
          q: "What happens if the AC is too big?",
          a: "It cools the air so fast the thermostat is satisfied before humidity is removed — you get a cold, clammy house and short on/off cycles that wear out the compressor. Slightly oversizing to the next half-ton is fine; doubling the size is not.",
        },
        {
          q: "How many tons is 36,000 BTU?",
          a: "3 tons — one ton of cooling equals 12,000 BTU/hr. Common residential sizes run 1.5 to 5 tons in half-ton steps.",
        },
        {
          q: "Does ceiling height really matter?",
          a: "Yes. Cooling load scales with air volume, not floor area. A 1,500 ft² room with 12-foot ceilings holds 50% more air than the same footprint with 8-foot ceilings, and the calculator scales the load accordingly.",
        },
      ]}
      related={[
        {
          href: "/tools/plumbing/water-heater-sizing-calculator",
          name: "Water heater sizing",
          blurb: "Tank gallons or tankless GPM from the household's busiest hour.",
        },
        {
          href: "/tools/electrical/voltage-drop-calculator",
          name: "Voltage drop",
          blurb: "Wire size for long runs — keep the drop under 3%.",
        },
        {
          href: "/tools/business/hourly-rate-calculator",
          name: "Hourly rate calculator",
          blurb: "Find the rate that actually covers your costs and profit.",
        },
      ]}
      ctaTitle="Sized the system. Now quote it."
      ctaBody="TradeReady builds the quote from your numbers, sends a link the customer can approve on their phone, and converts it to an invoice in one tap."
    >
      <BtuCalculator />
    </ToolLayout>
  );
}
