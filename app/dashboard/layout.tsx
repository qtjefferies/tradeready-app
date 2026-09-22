import { requirePageUser } from "@/lib/require-page-user";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import { IconSettings } from "@/components/icons";

/**
 * The dashboard depends on the session cookie, so it must never be
 * statically prerendered — prerendering would bake in a logged-out
 * (or broken redirect) response. Force per-request rendering.
 */
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 md:pb-12">
      {/* The identity block doubles as the way into settings. Eight targets
          would crush the mobile tab bar, and account setup is where every
          phone app puts it anyway: behind your own name. */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="stat-label">TradeReady HQ</p>
          <h1 className="mt-1 truncate font-display text-3xl uppercase tracking-wide text-paper sm:text-4xl">
            {user.businessName ? `${user.businessName}` : "Your dashboard"}
          </h1>
          <p className="mt-1 truncate text-sm font-semibold text-bone-400">
            {user.trade ? `${user.trade} · ` : ""}{user.email}
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          aria-label="Settings"
          className="flex min-h-[48px] shrink-0 touch-manipulation items-center gap-2 rounded-xl border-2 border-ink-600 bg-ink-800 px-4 text-sm font-bold text-bone-300 transition hover:border-bone-500 hover:text-paper active:scale-[0.97]"
        >
          <IconSettings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Link>
      </div>
      <DashboardNav />
      {children}
    </div>
  );
}
