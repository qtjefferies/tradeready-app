import { requirePageUser } from "@/lib/require-page-user";
import DashboardNav from "@/components/DashboardNav";

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
      <div className="mb-8">
        <p className="stat-label">TradeReady HQ</p>
        <h1 className="mt-1 font-display text-3xl uppercase tracking-wide text-paper sm:text-4xl">
          {user.businessName ? `${user.businessName}` : "Your dashboard"}
        </h1>
        <p className="mt-1 text-sm font-semibold text-bone-400">
          {user.trade ? `${user.trade} · ` : ""}{user.email}
        </p>
      </div>
      <DashboardNav />
      {children}
    </div>
  );
}
