import type { LineItem } from "./money";

/**
 * Tool → quote bridge. A calculator saves a payload to localStorage; the new
 * quote page (or the dashboard nudge) picks it up and pre-fills the editor.
 * No account needed to calculate — the payload simply waits until login.
 */
export interface ToolQuotePayload {
  /** e.g. "Concrete calculator" */
  source: string;
  /** e.g. "/tools/general/concrete-calculator" */
  sourceHref: string;
  title: string;
  notes: string;
  lines: LineItem[];
}

const KEY = "tradeready.toolQuote.v1";

export function saveToolQuote(p: ToolQuotePayload): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — the CTA still leads to signup */
  }
}

export function readToolQuote(): ToolQuotePayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<ToolQuotePayload>;
    if (!p || !Array.isArray(p.lines)) return null;
    return p as ToolQuotePayload;
  } catch {
    return null;
  }
}

export function clearToolQuote(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function peekToolQuote(): { source: string; sourceHref: string } | null {
  const p = readToolQuote();
  return p ? { source: p.source, sourceHref: p.sourceHref } : null;
}
