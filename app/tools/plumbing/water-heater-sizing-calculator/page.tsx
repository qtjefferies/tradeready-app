import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import WaterHeater from "@/components/tools/calculators/WaterHeater";

export const metadata: Metadata = {
  title: "Water Heater Sizing Calculator — Tank & Tankless",
  description:
    "Free water heater sizing calculator: find the right tank size in gallons or tankless flow rate in GPM from the household's busiest hour. No guesswork.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Plumbing"
      tradeHref="/tools"
      title="Water heater sizing calculator"
      lede="Size it from the busiest hour, not the number of bedrooms. Count what runs at once — showers, dishwasher, laundry — and get the tank gallons or tankless GPM the house actually needs."
      mathTitle="How the math works"
      mathSteps={[
        "Tank sizing starts with peak-hour demand: every back-to-back shower draws about 10 gallons of hot water, a dishwasher load about 6, a warm laundry load about 7.",
        "Add up everything that runs in the busiest hour — usually the morning rush — and add a 25% buffer so the last shower isn't lukewarm.",
        "Round up to the nearest standard tank size (30, 40, 50, 65, 75, 80 gallons). Then check the yellow EnergyGuide label: the first-hour rating should clear your peak-hour demand.",
        "Tankless sizing is about flow, not storage: add up simultaneous fixtures — 2.0 GPM per shower, 1.5 per dishwasher, 2.0 per washing machine, 1.0 per faucet — and shop for a unit rated at or above that GPM at your climate's temperature rise.",
      ]}
      mathNote="Fixture draws are planning estimates, not lab measurements. Low-flow showerheads and efficient dishwashers draw less; long teenage showers draw more. When in doubt, size up one step — an oversized tank just cycles less."
      faqs={[
        {
          q: "What size water heater do I need for a family of 4?",
          a: "Usually a 50-gallon tank, but the busiest hour matters more than headcount. Two back-to-back showers plus a dishwasher is about 26 gallons of peak demand — a 40-gallon tank handles it, a 50 gives comfortable headroom. Run the numbers above for your actual routine.",
        },
        {
          q: "What is first-hour rating and why does it matter?",
          a: "First-hour rating (FHR) is how many gallons of hot water the heater can deliver in an hour starting from a full tank. It's the number that actually determines whether the third shower is hot. Find it on the yellow EnergyGuide label and make sure it clears your peak-hour demand.",
        },
        {
          q: "How many GPM tankless water heater do I need?",
          a: "Add up everything that might run at once: two simultaneous showers need about 4 GPM of hot water, plus 1.5 for a dishwasher. Most households land between 4 and 7 GPM. Then check the rating at your temperature rise — a unit rated 9 GPM in Florida might only do 5 GPM in Minnesota groundwater.",
        },
        {
          q: "Is it bad to oversize a water heater?",
          a: "Mildly oversizing a tank heater is harmless — it just cycles less often and costs a bit more upfront plus slightly higher standby loss. Undersizing is the painful mistake: cold showers and a heater running constantly to catch up.",
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
      ctaTitle="Sized the heater. Now quote the install."
      ctaBody="TradeReady turns the job into a professional quote with your numbers, lets the customer approve by text link, and reminds you when the install is due for replacement years from now."
    >
      <WaterHeater />
    </ToolLayout>
  );
}
