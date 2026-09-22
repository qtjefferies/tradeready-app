import type { Metadata } from "next";
import Link from "next/link";
import { resetTokenValid } from "@/lib/auth";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your account.",
  robots: { index: false, follow: false },
};

/** The token lives in the URL, so this must never be cached or prerendered. */
export const dynamic = "force-dynamic";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  // Checked server-side before showing the form, so an expired link says so
  // immediately instead of after the user has typed a new password twice.
  const valid = token ? await resetTokenValid(token) : false;

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      {valid ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="card p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
            This link has expired
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
            Reset links work once and last an hour. Ask for a fresh one and
            it&apos;ll be in your inbox in a moment.
          </p>
          <Link href="/forgot" className="btn-primary mt-6 w-full">
            Send a new link
          </Link>
          <Link href="/login" className="btn-ghost mt-3 w-full">
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}
