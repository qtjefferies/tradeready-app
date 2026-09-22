"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChart, IconMoneyFound } from "./icons";

/**
 * Sub-navigation for the two intelligence screens.
 *
 * They're one product idea — "what your own records already know" — so they
 * share a single entry in the main nav and split here. It also keeps the
 * mobile tab bar from growing to eight cramped targets.
 */
const TABS = [
  { href: "/dashboard/money", label: "Money found", Icon: IconMoneyFound },
  { href: "/dashboard/money/win-rate", label: "Win rate", Icon: IconChart },
];

export default function MoneyTabs() {
  const pathname = usePathname();
  return (
    <div className="filter-rail mt-6" role="tablist" aria-label="Intelligence screens">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={`filter-pill ${active ? "filter-pill-active" : ""}`}
          >
            <t.Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
