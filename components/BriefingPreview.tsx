"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The landing-page briefing mockup, which deals its rows in one at a time.
 *
 * This card sits well below the fold, so a plain load-triggered animation
 * would finish long before anyone scrolled to it. Instead the stagger starts
 * when the card enters the viewport — which is immediately on a tall screen,
 * and on the way down otherwise.
 *
 * Without JavaScript the rows render fully visible; the animation is an
 * enhancement, never the thing standing between a reader and the content.
 */
export function BriefingPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already on screen at mount (tall viewport, or a reload part-way down).
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="card overflow-hidden">
      <div className="hazard h-2" aria-hidden="true" />
      <div className="p-6">
        <p className="stat-label">Tuesday morning briefing</p>
        <div className={`mt-4 space-y-3${shown ? " brief-deal" : ""}`}>
          <div className="brief-row rounded-xl border-2 border-safety-500/40 bg-safety-500/10 p-4">
            <p className="text-[15px] font-bold text-paper">2 quotes need follow-up</p>
            <p className="mt-1 text-sm text-bone-400">Miller water heater · sent 4 days ago</p>
          </div>
          <div className="brief-row rounded-xl border-2 border-alert-400/40 bg-alert-400/10 p-4">
            <p className="text-[15px] font-bold text-paper">1 invoice overdue</p>
            <p className="mt-1 text-sm text-bone-400">INV-118 · $1,240 · 6 days past due</p>
          </div>
          <div className="brief-row rounded-xl border border-ink-600 bg-ink-900 p-4">
            <p className="text-[15px] font-bold text-paper">3 jobs today</p>
            <p className="mt-1 text-sm text-bone-400">First starts 8:00 AM — panel upgrade, Oak St</p>
          </div>
          <div className="brief-row rounded-xl border border-ink-600 bg-ink-900 p-4">
            <p className="text-[15px] font-bold text-paper">1 review to ask for</p>
            <p className="mt-1 text-sm text-bone-400">Thursday&apos;s repipe went great — ask the Johnsons</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-bone-600">
          Illustrative example of the briefing layout.
        </p>
      </div>
    </div>
  );
}
