import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import WireAmpacity from "@/components/tools/calculators/WireAmpacity";

export const metadata: Metadata = {
  title: "Wire Ampacity Calculator — NEC 310.16 with Derating",
  description:
    "Free wire ampacity calculator for electricians: NEC Table 310.16 ampacity for copper and aluminum at 60/75/90°C, corrected for ambient temperature and conduit fill (310.15), capped by terminal rating, with the max breaker size. Or enter a load and get the wire.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Electrical"
      tradeHref="/tools"
      title="Wire ampacity calculator"
      lede="How many amps can this wire carry once it's in a hot attic with eight other conductors? Pick the wire or enter the load and get the NEC 310.16 answer with the derating already done — ambient correction, conduit fill, the terminal rating that quietly caps your 90°C THHN, and the biggest breaker you can legally put on it."
      mathTitle="How the math works"
      mathSteps={[
        "Start with the allowable ampacity from NEC Table 310.16 for the wire size, material, and insulation temperature rating — 60°C, 75°C, or 90°C. 12 AWG copper, for example, is 20 A, 25 A, or 30 A depending on the column.",
        "Multiply by the ambient temperature correction factor from Table 310.15(B)(1). The table is written for 30°C (86°F); a 105°F attic is about 41°C, which is ×0.82 in the 75°C column and ×0.87 in the 90°C column. Below 21°C this tool holds the factor at 1.00 instead of applying the table's uplift.",
        "Multiply by the adjustment factor for more than three current-carrying conductors in the same raceway or cable, Table 310.15(C)(1): 4–6 conductors ×0.80, 7–9 ×0.70, 10–20 ×0.50, 21–30 ×0.45. Equipment grounds don't count; neutrals count on 2-wire circuits and nonlinear loads (310.15(E)).",
        "Cap the result at the terminal rating, NEC 110.14(C). Breakers and lugs on equipment rated 100 A and under are 60°C terminals unless marked otherwise, and almost everything else is 75°C. The 90°C column is only there to give you derating headroom — the number you size the breaker from can never exceed the 75°C (or 60°C) value for that wire.",
        "Find the breaker: the largest standard size in 240.6(A) that protects the conductor. Under 800 A, 240.4(B) lets you round up to the next standard size when the derated ampacity doesn't land on one. The small-conductor rule in 240.4(D) wins regardless: 14 AWG copper stops at 15 A, 12 AWG at 20 A, 10 AWG at 30 A (12 and 10 AWG aluminum at 15 A and 25 A).",
        "For a continuous load — 3 hours or more at full current — 210.19(A) and 215.2(A) require the conductor and breaker to be sized at 125% of the load. In the \"what wire for this load\" mode the tool multiplies the load by 1.25 and finds the smallest size whose derated, terminal-capped ampacity covers it and whose maximum breaker covers the required breaker.",
      ]}
      mathNote="Table values follow NEC Table 310.16 (not more than three current-carrying conductors, 30°C ambient) and Tables 310.15(B)(1) and 310.15(C)(1). The continuous-load check here compares 125% of the load against the derated ampacity, which is stricter than the code minimum. Conductors on rooftops in sunlight, in cable trays, or underground follow additional rules this tool doesn't cover. Confirm with local code and the equipment listing before installing."
      faqs={[
        {
          q: "How many amps can 12 gauge wire carry?",
          a: "12 AWG copper is rated 20 A at 60°C, 25 A at 75°C, and 30 A at 90°C in NEC Table 310.16 — but 240.4(D) caps the breaker at 20 A no matter which column you use. The higher ratings only help you absorb derating: 12 AWG THHN in a 105°F attic with six conductors is 30 × 0.87 × 0.80 = 20.9 A, which still supports a 20 A breaker. The same wire at 60°C would be down to 13 A.",
        },
        {
          q: "Can I use the 90°C column for THHN wire?",
          a: "Only as the starting point for derating. NEC 110.14(C) limits the final ampacity to the temperature rating of the terminals the wire lands on, and most breakers and lugs are rated 75°C (60°C for some equipment 100 A and under). So 6 AWG THHN starts at 75 A for correction and adjustment, but you can't size the breaker above its 75°C value of 65 A. This calculator applies that cap automatically and tells you when it bites.",
        },
        {
          q: "How much do you derate wire for more than 3 conductors in conduit?",
          a: "Table 310.15(C)(1): 4 to 6 current-carrying conductors ×0.80, 7 to 9 ×0.70, 10 to 20 ×0.50, 21 to 30 ×0.45. Count only current-carrying conductors — equipment grounding conductors never count, and a neutral that carries only the unbalanced current of a 3-wire or 4-wire circuit doesn't either. The adjustment stacks with the ambient temperature correction; both multiply the table value.",
        },
        {
          q: "What is the ambient temperature correction factor?",
          a: "Table 310.16 assumes 30°C (86°F). Above that, Table 310.15(B)(1) reduces the ampacity: in the 75°C column it's ×0.94 at 31–35°C, ×0.88 at 36–40°C, ×0.82 at 41–45°C, ×0.75 at 46–50°C, and so on. Attics, rooftops, and boiler rooms are where this matters most. Below 21°C the table allows a small increase; this tool stays at 1.00 there rather than claim ampacity you may not want to rely on.",
        },
      ]}
      related={[
        {
          href: "/tools/electrical/voltage-drop-calculator",
          name: "Voltage drop calculator",
          blurb: "Size the wire for a long run so the load still sees full voltage.",
        },
        {
          href: "/tools/electrical/conduit-bending-calculator",
          name: "Conduit bending calculator",
          blurb: "Offsets, saddles, and 90s — bend marks for any conduit size.",
        },
        {
          href: "/tools/electrical/box-fill-calculator",
          name: "Box fill calculator",
          blurb: "Count the conductors, devices, and clamps and get the box you need.",
        },
      ]}
      ctaTitle="Sized the wire. Now bill for it."
      ctaBody="TradeReady turns the job into a quote, the quote into an invoice, and finds the work you forgot to bill — the office manager in your pocket."
    >
      <WireAmpacity />
    </ToolLayout>
  );
}
