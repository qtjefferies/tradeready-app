import type { Metadata } from "next";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `${siteName} terms of service.`,
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-white">Terms of service</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-400">
        <section>
          <h2 className="font-display text-lg font-bold text-white">The service</h2>
          <p className="mt-2">
            {siteName} provides tools to help trades businesses manage quotes,
            invoices, schedules, customers, and reviews. The service is
            provided “as is” without warranties of any kind.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">Your account</h2>
          <p className="mt-2">
            You are responsible for keeping your password secure and for
            activity under your account. One account per business; do not share
            credentials.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">Your content</h2>
          <p className="mt-2">
            You own everything you create in {siteName}. You are responsible
            for the accuracy of your quotes, invoices, and customer data.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">AI drafts</h2>
          <p className="mt-2">
            AI-generated drafts are starting points, not professional advice.
            Review every line item, price, and message before sending — you are
            responsible for what you send to your customers.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">Acceptable use</h2>
          <p className="mt-2">
            Do not use {siteName} for anything unlawful, to harass customers,
            or to attempt to access other users&apos; data. We may suspend
            accounts that abuse the service.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">Limitation of liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, {siteName} is not liable
            for indirect or consequential damages, including lost business or
            data, arising from use of the service.
          </p>
        </section>
      </div>
    </div>
  );
}
