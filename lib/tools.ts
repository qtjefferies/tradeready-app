/**
 * The free-tool catalog — one source of truth for the homepage section, the
 * /tools index, and anywhere else the calculators are listed. Adding a tool
 * here is enough for it to show up everywhere.
 */

export type TradeKey = "electrical" | "hvac" | "plumbing" | "general" | "business";

export interface FreeTool {
  href: string;
  /** Full name, e.g. "Voltage drop calculator". */
  name: string;
  /** Tight name for small cards, e.g. "Voltage drop". */
  short: string;
  trade: TradeKey;
  /** Tag shown on the card: social proof or audience. */
  tag: string;
  /** The question the tool answers — used as the card's hook. */
  answers: string;
  /** What it gives back, in one line. */
  blurb: string;
  /** Short blurb for the homepage. */
  teaser: string;
  /** Shown on the homepage grid (keep to five so the grid stays two rows). */
  featured?: boolean;
}

export const TRADE_LABEL: Record<TradeKey, string> = {
  electrical: "Electrical",
  hvac: "HVAC",
  plumbing: "Plumbing",
  general: "General",
  business: "Business",
};

export const TOOLS: FreeTool[] = [
  {
    href: "/tools/electrical/voltage-drop-calculator",
    name: "Voltage drop calculator",
    featured: true,
    short: "Voltage drop",
    trade: "electrical",
    tag: "Most used",
    answers: "What wire size for a long run?",
    blurb:
      "The smallest wire size that keeps the drop under 3% — copper or aluminum, single- or three-phase, any run length.",
    teaser: "The smallest wire that keeps drop under 3%",
  },
  {
    href: "/tools/electrical/ohms-law-calculator",
    name: "Ohm's law calculator",
    short: "Ohm's law",
    trade: "electrical",
    tag: "Circuits",
    answers: "Know two of volts, amps, ohms, watts?",
    blurb:
      "Enter any two of voltage, current, resistance, and power and get the other two — plus BTU/hr, kWh, and the breaker size after the 80% continuous-load rule.",
    teaser: "1,500 W at 120 V is 12.5 A and a 20 A breaker",
  },
  {
    href: "/tools/electrical/box-fill-calculator",
    name: "Box fill calculator",
    short: "Box fill",
    trade: "electrical",
    tag: "NEC 314.16",
    answers: "Is this box big enough?",
    blurb:
      "Count conductors, grounds, clamps, fittings, and devices; get the cubic inches NEC 314.16 requires and every standard metal box that passes, smallest in each family called out.",
    teaser: "Three 12/2s, a receptacle, and clamps need 22.5 in³",
  },
  {
    href: "/tools/hvac/btu-calculator",
    name: "BTU calculator",
    featured: true,
    short: "BTU / AC sizing",
    trade: "hvac",
    tag: "Homeowner favorite",
    answers: "What size AC does this room need?",
    blurb:
      "Cooling load in BTU/hr and tons from square footage, climate, ceiling height, insulation, and sun exposure.",
    teaser: "BTU/hr and tons from square footage and climate",
  },
  {
    href: "/tools/plumbing/water-heater-sizing-calculator",
    name: "Water heater sizing calculator",
    featured: true,
    short: "Water heater sizing",
    trade: "plumbing",
    tag: "Pro pick",
    answers: "Tank or tankless, and how big?",
    blurb:
      "Tank gallons or tankless GPM, sized from the household's busiest hour — showers, laundry, dishwasher — not a guess.",
    teaser: "Tank gallons or tankless GPM from peak-hour demand",
  },
  {
    href: "/tools/general/concrete-calculator",
    name: "Concrete calculator",
    featured: true,
    short: "Concrete",
    trade: "general",
    tag: "DIY favorite",
    answers: "How much concrete do I order?",
    blurb:
      "Cubic yards to order or bags to buy for any slab, patio, or driveway — with waste built in so you don't come up short.",
    teaser: "Yards to order or bags to buy, waste included",
  },
  {
    href: "/tools/business/hourly-rate-calculator",
    name: "Hourly rate calculator",
    featured: true,
    short: "Hourly rate",
    trade: "business",
    tag: "Shop essential",
    answers: "What should I actually charge?",
    blurb:
      "The rate that covers your pay, overhead, and profit — worked back from the hours you can really bill, not the hours you work.",
    teaser: "The rate that covers pay, overhead, and profit",
  },
];

export const TRADE_ORDER: TradeKey[] = ["electrical", "hvac", "plumbing", "general", "business"];

export function toolsByTrade(): { trade: TradeKey; label: string; tools: FreeTool[] }[] {
  return TRADE_ORDER.map((trade) => ({ trade, label: TRADE_LABEL[trade], tools: TOOLS.filter((t) => t.trade === trade) })).filter(
    (g) => g.tools.length > 0
  );
}
