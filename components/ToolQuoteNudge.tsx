"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearToolQuote, peekToolQuote } from "@/lib/toolQuote";

/**
 * Shown on the dashboard briefing when a calculator payload is waiting —
 * covers the flow where the contractor calculated first and signed in after.
 */
export default function ToolQuoteNudge() {
  const [peek, setPeek] = useState<{ source: string; sourceHref: string } | null>(null);

  useEffect(() => {
    setPeek(peekToolQuote());
  }, []);

  if (!peek) return null;

  return (
    <div className="card mt-6 overflow-hidden">
      <div className="hazard h-1.5" aria-hidden="true" />
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg uppercase tracking-wide text-paper">
            Your {peek.source.toLowerCase()} calculation is ready
          </p>
          <p className="mt-1 text-sm text-bone-400">
            Turn it into a quote draft — the numbers carry over, you add your price.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/dashboard/quotes/new" className="btn-primary !min-h-[48px] text-base">
            Turn into a quote →
          </Link>
          <button
            type="button"
            onClick={() => {
              clearToolQuote();
              setPeek(null);
            }}
            className="btn-secondary !min-h-[48px]"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
