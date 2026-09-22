import type { Metadata } from "next";
import { ToolLayout } from "@/components/tools/ToolLayout";
import BoxFill from "@/components/tools/calculators/BoxFill";

export const metadata: Metadata = {
  title: "Box Fill Calculator — NEC 314.16 Electrical Box Sizing",
  description:
    "Free NEC 314.16 box fill calculator: count conductors, grounds, clamps, fittings, and devices, get the required cubic inches, and see which standard metal boxes from Table 314.16(A) pass.",
};

export default function Page() {
  return (
    <ToolLayout
      trade="Electrical"
      tradeHref="/tools"
      title="Box fill calculator"
      lede="Count what's going in the box and get the cubic inches NEC 314.16 requires, then see every standard metal box that passes — with the smallest one in each family called out."
      mathTitle="How the math works"
      mathSteps={[
        "Count the volume allowances per NEC 314.16(B). (B)(1) Conductors: each insulated conductor that enters the box and is spliced, terminated, or leaves again counts once. A conductor that passes through unbroken counts once for the whole loop, and pigtails that never leave the box don't count.",
        "(B)(2) Clamps: if the box has one or more internal cable clamps, add one allowance. (B)(3) Support fittings: add one allowance for each fixture stud or hickey. Connectors in knockouts count zero.",
        "(B)(4) Devices: each yoke or strap (receptacle, switch, dimmer) counts as two allowances, at the largest conductor connected to it. (B)(5) Grounds: all equipment grounding conductors together count as one allowance, at the largest ground present.",
        "Multiply the total allowances by the volume for the conductor size in Table 314.16(B): 14 AWG 2.00 in³, 12 AWG 2.25, 10 AWG 2.50, 8 AWG 3.00, 6 AWG 5.00. Strictly, each allowance is taken at its own conductor's size; this calculator takes them all at the size you pick, which is exact when everything in the box is the same size and conservative when the grounds are smaller.",
        "Compare against the box volume in Table 314.16(A). The box passes when its volume is at or above the required cubic inches. Extension rings and plaster rings marked with a volume add to the box.",
      ]}
      mathNote="Volumes and allowances follow NEC 314.16 (2023). Nonmetallic boxes carry their volume stamped inside per 314.16(A)(2); use that figure. Boxes with conductors 4 AWG and larger are sized under 314.28 instead. Confirm with local code."
      faqs={[
        {
          q: "How do you calculate box fill?",
          a: "Add up the volume allowances: one per insulated conductor entering the box, one for all grounds together, one for internal clamps if present, one per fixture stud or hickey, and two per device yoke. Multiply that count by the cubic inches for the conductor size (2.25 in³ for 12 AWG). The box must have at least that much volume, from Table 314.16(A) for metal boxes or the stamp inside a plastic one.",
        },
        {
          q: "How many 12 AWG wires can go in a 4 × 4 box?",
          a: "A 4 × 1-1/2 square box is 21.0 in³, which is 9 allowances at 2.25 in³ for 12 AWG. With a device (2), grounds (1), and internal clamps (1), that leaves room for 5 insulated conductors — two 12/2 cables plus one more wire. A 4 × 2-1/8 square at 30.3 in³ gives 13 allowances and is the usual answer for anything busy.",
        },
        {
          q: "Do ground wires count in box fill?",
          a: "Yes, but all of them together count as a single allowance, sized for the largest ground in the box, per 314.16(B)(5). Four 12 AWG grounds in a box add 2.25 in³ total, not 9.00. If there are more than four, the 2023 NEC adds a quarter allowance for each additional ground beyond four; this calculator counts one allowance regardless, so check that case by hand.",
        },
        {
          q: "Do I count pigtails and wire nuts in box fill?",
          a: "No. A pigtail that starts and ends inside the box is not counted under 314.16(B)(1), and wire nuts, tape, and pigtail leads are ignored. What you count are the conductors that come in through the knockouts, the devices, the clamps, and the fittings.",
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
      ctaTitle="Sized the box. Now bill for it."
      ctaBody="TradeReady turns the job into a quote, the quote into an invoice, and finds the work you forgot to bill — the office manager in your pocket."
    >
      <BoxFill />
    </ToolLayout>
  );
}
