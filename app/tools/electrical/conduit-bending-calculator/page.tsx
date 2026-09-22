import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import ConduitBending from "@/components/tools/calculators/ConduitBending";

export const metadata: Metadata = {
  title: "Conduit Bending Calculator — Offset & 90° Stub Marks",
  description:
    "Free conduit bending calculator for electricians: offset bend mark spacing, multipliers, and shrinkage for 10°–45° bends, plus 90° stub-up take-up for 1/2\"–1-1/4\" EMT.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Electrical"
      tradeHref="/tools"
      title="Conduit bending calculator"
      lede="Offsets and 90° stubs without the chart taped to your bender. Enter the offset depth or stub height and get your marks — in fractional inches, the way the shop measures."
      mathTitle="How the math works"
      mathSteps={[
        "Offset travel = offset depth × cosecant of the bend angle. The standard multipliers (6.0 for 10°, 3.9 for 15°, 2.6 for 22.5°, 2.0 for 30°, 1.4 for 45°) are just the cosecant rounded to what fits on a bender handle.",
        "Mark 1 goes where the offset starts. Measure the travel distance down the conduit and make mark 2 — bend the same angle at each mark, in opposite directions.",
        "Shrink = offset depth × shrink-per-inch for the angle (1/16\" at 10°, up to 3/8\" at 45°). The run between couplings gets shorter by this much, so allow for it before you cut.",
        "For a 90° stub-up, the bender eats some conduit into its radius — the take-up. Mark the conduit at stub height minus take-up (5\" for 1/2\" EMT, 6\" for 3/4\", 8\" for 1\", 11\" for 1-1/4\"), put the arrow on the mark, and pull to 90°.",
      ]}
      mathNote="Values follow the standard multiplier and take-up tables printed on hand benders (Greenlee, Klein, Ideal). If your bender lists its own take-up, use that number instead."
      faqs={[
        {
          q: "What is the multiplier for a 30-degree offset?",
          a: "2.0 — the cosecant of 30° is exactly 2, which is why 30° is the most common offset angle: the math is just doubling the offset depth. A 6-inch offset needs 12 inches between marks.",
        },
        {
          q: "What is conduit shrinkage and do I need to account for it?",
          a: "When you bend an offset, the straight-line run gets shorter — that's shrinkage. At 30° it's 1/4 inch per inch of offset depth, so a 6-inch offset shortens the run by 1-1/2 inches. On short runs between boxes, that can leave a coupling short, so factor it in before cutting.",
        },
        {
          q: "Where do I put the bender for a 90-degree stub?",
          a: "Measure the finished stub height, subtract the take-up for your conduit size (5\" for 1/2\" EMT), and mark the conduit there. Line up the bender's arrow — or the star on some benders — with the mark and bend to 90°.",
        },
        {
          q: "Which offset angle should I use?",
          a: "30° for most work — easy math and moderate shrinkage. Use 10° or 15° when the offset is shallow and you want minimal shrinkage; use 45° when space is tight but expect 3/8\" of shrink per inch of offset.",
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
      ctaTitle="Bent the conduit. Now bill for it."
      ctaBody="TradeReady turns the job into a quote, the quote into an invoice, and finds the work you forgot to bill — the office manager in your pocket."
    >
      <ConduitBending />
    </ToolLayout>
  );
}
