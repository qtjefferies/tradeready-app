import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import ConcreteCalculator from "@/components/tools/calculators/ConcreteCalculator";

export const metadata: Metadata = {
  title: "Concrete Calculator — Cubic Yards & Bags",
  description:
    "Free concrete calculator: cubic yards to order or bags to buy for any slab, patio, or driveway. Includes 10% waste so you never short a pour.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="General"
      tradeHref="/tools"
      title="Concrete calculator"
      lede="How much concrete for a slab, patio, or driveway — in cubic yards to order or bags to buy. Enter three dimensions and get an order quantity with waste built in."
      mathTitle="How the math works"
      mathSteps={[
        "Volume = length × width × thickness, with thickness converted from inches to feet. A 10×10 slab at 4 inches is 10 × 10 × (4/12) = 33.3 cubic feet.",
        "Divide cubic feet by 27 to get cubic yards — the unit ready-mix is sold in.",
        "Add 10% waste for the order quantity. Forms are never perfect, subgrade is never level, and shorting a pour means a cold joint or a second delivery fee.",
        "For bags: divide the cubic footage (plus 5% waste) by the yield per bag — 0.6 ft³ for an 80-lb bag, 0.45 for 60-lb, 0.30 for 40-lb — and round up. You can't buy half a bag.",
      ]}
      mathNote="Rule of thumb: a full pallet of 80-lb bags (42 bags) yields almost exactly 1 cubic yard. If the job needs more than a yard or two, ready-mix is usually cheaper than bags — and your back will thank you."
      faqs={[
        {
          q: "How many bags of concrete do I need for a 10x10 slab?",
          a: "At 4 inches thick, a 10×10 slab is 1.23 cubic yards — about 75 eighty-pound bags. At 6 inches it's 1.85 yards, about 112 bags. That's a lot of mixing: anything over a yard is usually worth pricing as ready-mix.",
        },
        {
          q: "How thick should a concrete slab be?",
          a: "4 inches for patios, walkways, and shed floors. 6 inches for driveways and anything carrying vehicles. Go thicker — not richer mix — when the load demands it, and always compact the subgrade first.",
        },
        {
          q: "How much does one 80-lb bag of concrete cover?",
          a: "One 80-lb bag yields about 0.6 cubic feet — roughly a 2×2 foot area at 2 inches thick, or about 1.8 square feet at 4 inches thick.",
        },
        {
          q: "Should I add extra concrete to my order?",
          a: "Yes — 10% is the standard waste factor. An under-ordered pour leaves you with a cold joint (a weak seam where new concrete meets set concrete) or paying for a short-load delivery. Over-ordering by half a yard is always cheaper than under-ordering.",
        },
      ]}
      related={[
        {
          href: "/tools/business/hourly-rate-calculator",
          name: "Hourly rate calculator",
          blurb: "Find the rate that actually covers your costs and profit.",
        },
        {
          href: "/tools/electrical/conduit-bending-calculator",
          name: "Conduit bending",
          blurb: "Offset mark spacing, multipliers, and 90° stub take-up.",
        },
        {
          href: "/tools/hvac/btu-calculator",
          name: "BTU calculator",
          blurb: "Size an AC or furnace from square footage, climate, and insulation.",
        },
      ]}
      ctaTitle="Poured the slab. Now bill for it."
      ctaBody="TradeReady builds the quote from your material and labor numbers, tracks the invoice until it's paid, and flags the jobs you forgot to bill."
    >
      <ConcreteCalculator />
    </ToolLayout>
  );
}
