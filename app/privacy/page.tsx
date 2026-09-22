import type { Metadata } from "next";
import { siteName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: `${siteName} privacy policy: what we collect, how it's used, and your choices.`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-white">Privacy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-400">
        <section>
          <h2 className="font-display text-lg font-bold text-white">What we collect</h2>
          <p className="mt-2">
            We collect the information you give us: your name, email, password
            (stored only as a bcrypt hash), business name, trade, phone number,
            and the business data you create — customers, quotes, invoices,
            jobs, equipment records, and review requests.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">How we use it</h2>
          <p className="mt-2">
            Your data runs the service: rendering your dashboard, generating
            your quotes and invoices, and drafting AI-assisted text. We do not
            sell your data. We do not use your data to train AI models.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">AI features</h2>
          <p className="mt-2">
            When you ask for AI help (quote drafting, follow-up, reminder, or
            review-request text), the job description you provide is sent to our
            AI provider to generate the draft. Drafts are shown to you for
            review — nothing is sent anywhere on your behalf.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">Cookies & sessions</h2>
          <p className="mt-2">
            We use a single httpOnly session cookie to keep you signed in. We
            store only a cryptographic hash of the session token — never the
            token itself.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">Your data, your business</h2>
          <p className="mt-2">
            You can download your quotes and invoices as PDFs anytime. To
            request export or deletion of your account and data, contact us and
            we will handle it.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-white">Security</h2>
          <p className="mt-2">
            Passwords are hashed with bcrypt. Session tokens are random
            256-bit values, stored only as SHA-256 hashes. All access to your
            business data is scoped to your account.
          </p>
        </section>
      </div>
    </div>
  );
}
