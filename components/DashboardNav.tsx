"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBriefing,
  IconCustomers,
  IconInvoice,
  IconMoneyFound,
  IconQuote,
  IconReviews,
  IconSchedule,
  IconWrench,
} from "./icons";

/**
 * DashboardNav — section navigation.
 * Mobile: fixed bottom tab bar (thumb-friendly, 64px targets, safe-area aware).
 * Desktop: pill buttons up top. Same links, same behavior.
 */
const LINKS = [
  { href: "/dashboard", label: "Briefing", short: "Briefing", Icon: IconBriefing },
  // Second, not last: this is the screen that earns the subscription, and a
  // tab nobody scrolls to is a feature nobody uses.
  { href: "/dashboard/money", label: "Money", short: "Money", Icon: IconMoneyFound },
  { href: "/dashboard/quotes", label: "Quotes", short: "Quotes", Icon: IconQuote },
  { href: "/dashboard/invoices", label: "Invoices", short: "Invoices", Icon: IconInvoice },
  { href: "/dashboard/schedule", label: "Schedule", short: "Schedule", Icon: IconSchedule },
  { href: "/dashboard/customers", label: "Customers", short: "Customers", Icon: IconCustomers },
  { href: "/dashboard/reviews", label: "Reviews", short: "Reviews", Icon: IconReviews },
  { href: "/tools", label: "Toolbox", short: "Tools", Icon: IconWrench },
];

export default function DashboardNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Dashboard sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink-700 bg-ink-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:static md:z-auto md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none"
    >
      <div className="mx-auto flex max-w-6xl items-stretch gap-1 px-2 py-1.5 md:justify-start md:gap-2 md:px-0 md:py-0">
        {LINKS.map((l) => {
          const active =
            l.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[60px] flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-extrabold uppercase tracking-wide transition active:scale-[0.96] md:min-h-[48px] md:flex-none md:flex-row md:gap-2 md:px-4 md:py-2.5 md:text-sm md:font-bold md:normal-case md:tracking-normal ${
                active
                  ? "text-safety-400 md:border-2 md:border-safety-500 md:bg-safety-500/15 md:text-safety-300"
                  : "text-bone-500 hover:text-bone-200 md:border-2 md:border-ink-600 md:bg-ink-800 md:text-bone-300 md:hover:border-bone-500 md:hover:text-paper"
              }`}
            >
              {active && (
                <span
                  className="absolute inset-x-6 top-0 h-[3px] rounded-b bg-safety-400 md:hidden"
                  aria-hidden="true"
                />
              )}
              <l.Icon className="h-5 w-5 md:h-4 md:w-4" />
              <span className="truncate">{l.short}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
