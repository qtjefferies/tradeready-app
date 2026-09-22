"use client";

import { useEffect, useState } from "react";
import QuoteEditor, { type QuoteDefaults, type QuotePrefill } from "@/components/QuoteEditor";
import type { Customer } from "@/lib/store";
import { clearToolQuote, readToolQuote } from "@/lib/toolQuote";

/**
 * Mount-gated prefill: QuoteEditor reads `initial`/`prefill` in its useState
 * initializers, so it must mount exactly once with the payload already known.
 * We render a loader until localStorage has been read, then mount for real.
 */
export default function NewQuoteClient({
  customers,
  trade,
  defaults,
}: {
  customers: Customer[];
  trade: string;
  defaults: QuoteDefaults | null;
}) {
  const [prefill, setPrefill] = useState<QuotePrefill | null | undefined>(undefined);

  useEffect(() => {
    const p = readToolQuote();
    if (p) {
      clearToolQuote();
      setPrefill({ title: p.title, notes: p.notes, line_items: p.lines });
    } else {
      setPrefill(null);
    }
  }, []);

  if (prefill === undefined) {
    return (
      <div>
        <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-paper">New quote</h2>
        <div className="card p-10 text-center text-sm text-bone-500">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl uppercase tracking-wide text-paper">New quote</h2>
      {prefill && (
        <p className="card mb-4 border-safety-500/40 p-4 text-sm text-bone-300">
          <span className="font-bold text-safety-300">From your calculation:</span> review the numbers below, add your
          price, pick the customer — then send it.
        </p>
      )}
      <QuoteEditor initial={null} customers={customers} trade={trade} defaults={defaults} prefill={prefill} />
    </div>
  );
}
