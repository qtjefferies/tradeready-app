"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Dashboard error boundary.
 *
 * Without this, a thrown error drops the user on Next's raw error screen —
 * a stack trace and a white page, which to a contractor reads as "the app is
 * broken and my data is gone". Says what happened, offers the two things
 * that actually help, and never shows the stack.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render failed:", error);
  }, [error]);

  return (
    <div className="empty-state mt-8">
      <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
        That screen didn&apos;t load
      </h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-bone-300">
        Something went wrong on our side. Nothing you&apos;ve saved is
        affected — your quotes, invoices and customers are all still there.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/dashboard" className="btn-secondary">
          Back to briefing
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-bone-600">
          If it keeps happening, quote this code to support: {error.digest}
        </p>
      )}
    </div>
  );
}
