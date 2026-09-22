import type { Metadata } from "next";
import { requirePageUser as requireUser } from "@/lib/require-page-user";
import { getSettings } from "@/lib/store";
import SettingsClient from "@/components/SettingsClient";
import { IconSettings } from "@/components/icons";

export const metadata: Metadata = {
  title: "Settings",
  description: "Your business details, document defaults, and account.",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = await getSettings(user.id);

  // The session proves the row exists; this is belt and braces for the window
  // where an account is deleted in another tab.
  if (!settings) {
    return (
      <div className="empty-state mt-8">
        <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
          Account not found
        </h2>
        <p className="mt-3 text-[15px] text-bone-300">
          Try signing out and back in.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-4 md:mt-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-safety-500/15 text-safety-300">
          <IconSettings className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-3xl uppercase leading-tight tracking-wide text-paper sm:text-4xl">
            Settings
          </h2>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-bone-300">
            Your business details go on every quote and invoice. Get them right
            once here instead of retyping them on every job.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <SettingsClient initial={settings} loginEmail={user.email} />
      </div>
    </div>
  );
}
