/**
 * Typical service life for the equipment trades install, in years.
 *
 * This is reference data, not a measurement: it says when a unit is old
 * enough that a replacement conversation is reasonable, nothing more. It is
 * deliberately conservative — the point is to start a call, not to claim a
 * failure date. Nothing here is presented to a customer as a prediction.
 *
 * Kept in code rather than a table because it is static per trade and the
 * contractor has nothing to configure yet. If per-user overrides ever matter,
 * this becomes a table with these values as the seed.
 */

export interface Lifespan {
  /** Lower-case substrings matched against the equipment description. */
  match: string[];
  /** Typical service life, in years. */
  years: number;
  /** Plain-words label used in the UI and in AI outreach. */
  label: string;
}

/**
 * Ordered most-specific first: "tankless water heater" must win over the
 * plain "water heater" entry, so the first match wins and specific rows
 * come before general ones.
 */
export const LIFESPANS: Lifespan[] = [
  // --- plumbing ---
  { match: ["tankless"], years: 20, label: "tankless water heater" },
  { match: ["water heater", "hot water tank"], years: 10, label: "water heater" },
  { match: ["water softener"], years: 12, label: "water softener" },
  { match: ["sump pump"], years: 8, label: "sump pump" },
  { match: ["well pump"], years: 12, label: "well pump" },
  { match: ["garbage disposal", "disposer"], years: 10, label: "garbage disposal" },
  { match: ["toilet"], years: 25, label: "toilet" },
  { match: ["faucet"], years: 15, label: "faucet" },

  // --- HVAC ---
  { match: ["heat pump"], years: 15, label: "heat pump" },
  { match: ["mini split", "mini-split", "ductless"], years: 15, label: "mini-split" },
  { match: ["furnace"], years: 18, label: "furnace" },
  { match: ["boiler"], years: 20, label: "boiler" },
  { match: ["condenser", "air conditioner", "a/c unit", "ac unit", "central air"], years: 15, label: "A/C condenser" },
  { match: ["air handler"], years: 15, label: "air handler" },
  { match: ["thermostat"], years: 10, label: "thermostat" },

  // --- electrical ---
  { match: ["panel", "breaker box", "service upgrade"], years: 30, label: "electrical panel" },
  { match: ["generator"], years: 20, label: "generator" },
  { match: ["ev charger", "evse"], years: 12, label: "EV charger" },
  { match: ["smoke detector", "smoke alarm", "co detector"], years: 10, label: "smoke detector" },

  // --- exterior / structure ---
  { match: ["asphalt shingle", "shingle roof", "roof"], years: 22, label: "roof" },
  { match: ["gutter"], years: 20, label: "gutters" },
  { match: ["siding"], years: 25, label: "siding" },
  { match: ["deck"], years: 15, label: "deck" },
  { match: ["fence"], years: 15, label: "fence" },
  { match: ["window"], years: 22, label: "windows" },
  { match: ["exterior paint", "repaint", "paint"], years: 8, label: "exterior paint" },

  // --- appliances a trade commonly installs ---
  { match: ["dishwasher"], years: 10, label: "dishwasher" },
  { match: ["garage door opener"], years: 12, label: "garage door opener" },
  { match: ["garage door"], years: 20, label: "garage door" },
];

/**
 * Find the service life for an equipment description, or null when nothing
 * matches. An unmatched description is left alone rather than given a
 * made-up default — a guessed lifespan would produce a confident-sounding
 * replacement pitch with nothing behind it.
 */
export function lifespanFor(description: string): Lifespan | null {
  const d = description.toLowerCase();
  return LIFESPANS.find((l) => l.match.some((m) => d.includes(m))) ?? null;
}

/**
 * Whole years between a YYYY-MM-DD install date and today, or null if the
 * date is missing or unparseable. Read as local calendar parts to match
 * `toDateOnly` in the store — a UTC round-trip can shift the day.
 */
export function ageInYears(installedAt: string | null): number | null {
  if (!installedAt) return null;
  const d = new Date(`${installedAt.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - d.getFullYear();
  const beforeAnniversary =
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (beforeAnniversary) years -= 1;
  return years;
}
