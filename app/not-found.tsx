import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * Custom 404. Also what a dead or revoked quote share link lands on, so the
 * copy has to make sense to a homeowner who has never heard of TradeReady —
 * not just to a logged-in contractor.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center sm:px-6">
      <p className="kicker justify-center">404</p>
      <h1 className="mt-5 font-display text-4xl uppercase leading-tight tracking-wide text-paper sm:text-5xl">
        Nothing here
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-bone-300">
        This page doesn&apos;t exist, or it did and doesn&apos;t any more.
      </p>
      <p className="mt-4 text-[15px] leading-relaxed text-bone-400">
        If you followed a quote link from a contractor, it may have been turned
        off or replaced. Get in touch with them directly and they&apos;ll send
        you a fresh one.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/" className="btn-primary">
          Go to the homepage
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          My dashboard
        </Link>
      </div>
    </div>
  );
}
