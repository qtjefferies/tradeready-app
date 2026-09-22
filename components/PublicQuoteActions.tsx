"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconX } from "./icons";

/**
 * Accept / decline controls on the customer-facing quote page.
 *
 * The customer is not a user of this app and will see this screen once, on a
 * phone, probably standing in a kitchen. So: two large buttons, one
 * confirmation step before anything is recorded, and plain language about
 * what the button actually does — accepting a quote is a commitment, and a
 * mis-tap must not make it for them.
 */
export default function PublicQuoteActions({
  token,
  businessName,
}: {
  token: string;
  businessName: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"accepted" | "declined" | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  async function submit(response: "accepted" | "declined") {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/public/quotes/${token}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          response,
          reason: response === "declined" ? reason.trim() : "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't record your answer. Please contact us directly.");
        return;
      }
      setDone(response);
      router.refresh();
    } catch {
      setError(
        "Couldn't reach the server. Check your connection, or contact us directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done === "accepted") {
    return (
      <div className="rounded-2xl border-2 border-money-400/40 bg-money-400/10 p-6 text-center">
        <p className="font-display text-2xl uppercase tracking-wide text-money-300">
          Quote accepted
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-bone-200">
          Thanks — {businessName} has been notified and will be in touch to book
          the work in.
        </p>
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div className="rounded-2xl border-2 border-ink-600 bg-ink-900 p-6 text-center">
        <p className="font-display text-2xl uppercase tracking-wide text-bone-300">
          Thanks for letting us know
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-bone-300">
          {businessName} has been notified. If anything changes, just get in
          touch — the quote is here if you want to look again.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300"
        >
          {error}
        </p>
      )}

      {confirming === null && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => setConfirming("accepted")}
            className="btn-primary flex-1 font-display text-xl uppercase tracking-wider sm:!min-h-[64px]"
          >
            <IconCheck className="h-5 w-5" /> Accept this quote
          </button>
          <button
            onClick={() => setConfirming("declined")}
            className="btn-secondary sm:!min-h-[64px]"
          >
            Not right now
          </button>
        </div>
      )}

      {confirming === "accepted" && (
        <div className="rounded-2xl border-2 border-safety-500/40 bg-safety-500/[0.07] p-5">
          <p className="font-display text-xl uppercase tracking-wide text-paper">
            Accept this quote?
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-bone-300">
            This tells {businessName} you want to go ahead at the price shown.
            They&apos;ll contact you to arrange a date — nothing is charged here
            and no payment details are taken.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => submit("accepted")}
              disabled={submitting}
              className="btn-primary flex-1 text-base"
            >
              {submitting ? "Sending…" : "Yes, go ahead"}
            </button>
            <button
              onClick={() => setConfirming(null)}
              disabled={submitting}
              className="btn-secondary"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {confirming === "declined" && (
        <div className="rounded-2xl border-2 border-ink-600 bg-ink-900 p-5">
          <p className="font-display text-xl uppercase tracking-wide text-paper">
            Not going ahead?
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-bone-300">
            No problem. If you want to say why, it helps {businessName} quote
            better next time — but it&apos;s entirely optional.
          </p>
          <label htmlFor="decline-reason" className="label-dark mt-4">
            Anything you&apos;d like to add? (optional)
          </label>
          <textarea
            id="decline-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="e.g. Went with someone else, or the timing doesn't work right now."
            className="input-dark"
          />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => submit("declined")}
              disabled={submitting}
              className="btn-secondary flex-1 text-base"
            >
              {submitting ? "Sending…" : "Send"}
            </button>
            <button
              onClick={() => setConfirming(null)}
              disabled={submitting}
              className="btn-ghost"
            >
              <IconX className="h-4 w-4" /> Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
