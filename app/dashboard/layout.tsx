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
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {user.businessName ? `${user.businessName}` : "Your dashboard"}
          </h1>
          <p className="text-sm text-slate-400">
            {user.trade ? `${user.trade} · ` : ""}{user.email}
          </p>
        </div>
        <DashboardNav />
      </div>
      {children}
    </div>
  );
}
