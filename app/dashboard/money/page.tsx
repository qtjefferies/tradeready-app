import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import { findOpportunities } from "@/lib/opportunities";
import MoneyFoundClient from "@/components/MoneyFoundClient";
import MoneyTabs from "@/components/MoneyTabs";
import { IconChart, IconMoneyFound } from "@/components/icons";

export const metadata: Metadata = {
  title: "Money found",
  description:
    "Revenue already sitting in your records: unbilled work, aging equipment, dormant customers, and old declines.",
};

/**
 * Money Found — the screen no filing-cabinet app has.
 *
 * Everywhere else in TradeReady shows work the contractor already knows
 * about. This reads their own history back to them and finds the money in it.
 */
export default async function MoneyPage() {
  const user = await requireUser();
  const found = await findOpportunities(user.id);

  return (
    <div>
      <div className="flex items-start gap-4 md:mt-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-money-400/15 text-money-300">
          <IconMoneyFound className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-3xl uppercase leading-tight tracking-wide text-paper sm:text-4xl">
            Money found
          </h2>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-bone-300">
            Work you&apos;ve already done, people who already paid you, and
            units you already installed. Nothing here is a lead you have to go
            buy.
          </p>
        </div>
      </div>

      <MoneyTabs />

      <div className="mt-6">
        <MoneyFoundClient found={found} />
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/dashboard/money/win-rate" className="btn-secondary">
          <IconChart className="h-4 w-4" /> See what you win and why
        </Link>
      </div>
    </div>
  );
}
