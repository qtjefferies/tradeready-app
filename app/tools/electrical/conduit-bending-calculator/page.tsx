import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import ConduitBending from "@/components/tools/calculators/ConduitBending";

export const metadata: Metadata = {
  title: "Conduit Bending Calculator — Offset, 90° Stub & Saddle Marks",
  description:
    "Free conduit bending calculator for electricians: offset bend marks, multipliers, and shrink for 10°–45° bends, 90° stub-up take-up for 1/2\"–1-1/4\" EMT, and three- and four-point saddle marks. Fractional inches, with a live 3D render.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Electrical"
      tradeHref="/tools"
      title="Conduit bending calculator"
      lede="Offsets, 90s, and saddles without the chart taped to your bender. Enter the offset depth, stub height, or obstruction size and get every mark in fractional inches — with a render of the finished bend so you can see where each mark lands."
      mathTitle="How the math works"
      mathSteps={[
        "Offset: distance between marks = offset depth × multiplier. The multipliers printed on a hand bender (6.0 for 10°, 3.9 for 15°, 2.6 for 22.5°, 2.0 for 30°, 1.4 for 45°) are the cosecant of the angle, rounded. Mark 1 where the offset starts, mark 2 that far along, bend the same angle at each mark in opposite directions.",
        "Shrink = offset depth × shrink per inch for the angle: 1/16\" at 10°, 1/8\" at 15°, 3/16\" at 22.5°, 1/4\" at 30°, 3/8\" at 45°. The run between fittings gets shorter by that much, so add it to your measurement before you cut.",
        "90° stub-up: the bender's radius eats some conduit — the take-up. Mark at stub height minus take-up (5\" for 1/2\" EMT, 6\" for 3/4\", 8\" for 1\", 11\" for 1-1/4\"), arrow on the mark, pull to 90°. For a back-to-back 90, the second mark is the back-to-back distance minus take-up, measured from the back of the first bend.",
        "Three-point saddle: center bend 45°, outer bends 22.5°. The outer marks go 2-1/2 × the obstruction height each side of the center mark. Shrink is 3/16\" per inch of obstruction height, so the center mark moves forward by that much from the obstruction's centerline.",
        "Four-point saddle: two opposing offsets at the angle you pick, each as deep as the obstruction is tall. The inner marks sit the obstruction width plus 1\" clearance each side apart; each outer mark is depth × multiplier from its inner mark. Shrink is the offset table's shrink, twice — the first offset's share is added to the near-edge measurement so the flat lands over the obstruction.",
      ]}
      mathNote={"Multipliers, shrink, and take-up follow the tables printed on standard hand benders (Greenlee, Klein, Ideal) for EMT. If your bender lists its own take-up or a different saddle notch, use its numbers. Every mark is rounded to the nearest 1/8\" — as close as a tape reads."}
      faqs={[
        {
          q: "What is the multiplier for a 30-degree offset?",
          a: "2.0 — the cosecant of 30° is exactly 2, which is why 30° is the most common offset angle: double the offset depth and that's your distance between marks. A 6-inch offset needs 12 inches between marks and shrinks the run by 1-1/2 inches.",
        },
        {
          q: "What is conduit shrink and do I really need to allow for it?",
          a: "When you bend an offset the straight-line run gets shorter — that's shrink. At 30° it's 1/4 inch per inch of offset depth. On a long run you can absorb it at a coupling; on a short piece between two boxes it can leave you an inch short, so add it to your measurement before cutting.",
        },
        {
          q: "Where do I put the bender for a 90-degree stub?",
          a: "Measure the finished stub height, subtract the take-up for your conduit size (5\" for 1/2\" EMT, 6\" for 3/4\", 8\" for 1\", 11\" for 1-1/4\"), and mark the conduit there. Line the bender's arrow up with the mark, hook toward the short end, and bend to 90°.",
        },
        {
          q: "How do I bend a back-to-back 90?",
          a: "Bend the first 90 as usual. Then measure the back-to-back distance from the back of that bend, subtract the take-up, and mark. Arrow on the mark with the hook toward the free end, and bend the second 90 in the same plane. Some benders have a star mark for this: put the star on the full distance instead of subtracting take-up.",
        },
        {
          q: "Three-point or four-point saddle?",
          a: "Three-point for a single round obstruction like a pipe or another conduit — one 45° in the middle and a 22.5° each side, three marks. Four-point when the obstruction is wide or flat, like a duct or a beam: two offsets back to back with a flat between them, four marks. Four-point takes more conduit and more care to keep in plane, but it clears anything.",
        },
        {
          q: "Which offset angle should I use?",
          a: "30° for most work — easy math and moderate shrink. 10° or 15° when the offset is shallow, the run is long, and you want the least shrink and the smoothest pull. 45° when space is tight, but expect 3/8\" of shrink per inch of offset and a harder wire pull.",
        },
      ]}
      related={[
        {
          href: "/tools/electrical/voltage-drop-calculator",
          name: "Voltage drop calculator",
          blurb: "Wire size for long runs — drop and ampacity both checked.",
        },
        {
          href: "/tools/electrical/box-fill-calculator",
          name: "Box fill calculator",
          blurb: "Cubic inches required and which standard boxes pass.",
        },
        {
          href: "/tools/electrical/ohms-law-calculator",
          name: "Ohm's law calculator",
          blurb: "Any two of volts, amps, ohms, watts — get the rest.",
        },
      ]}
      ctaTitle="Bent the conduit. Now bill for it."
      ctaBody="TradeReady turns the job into a quote, the quote into an invoice, and finds the work you forgot to bill — the office manager in your pocket."
    >
      <ConduitBending />
    </ToolLayout>
  );
}
