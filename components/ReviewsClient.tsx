"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MessageModal from "./MessageModal";
import type { Customer, Job, Review } from "@/lib/store";
import { StatusBadge } from "./Badges";

/**
 * ReviewsClient — review request tracking.
 * "Draft request" calls the AI review-request endpoint, shows the message in
 * a modal to copy, and logs the request. Nothing is sent automatically.
 * Received reviews are logged with a star rating.
 */
export default function ReviewsClient({
  reviews,
  customers,
  completeJobs,
}: {
  reviews: Review[];
  customers: Customer[];
  completeJobs: Job[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [jobId, setJobId] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ title: string; subtitle: string; message: string } | null>(null);

  const [ratingFor, setRatingFor] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [savingRating, setSavingRating] = useState(false);

  async function draftRequest() {
    const cid = customerId ? Number(customerId) : null;
    const jid = jobId ? Number(jobId) : null;
    if (!cid && !jid) {
      setError("Pick a customer or a completed job first.");
      return;
    }
    setDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/ai/review-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer_id: cid, job_id: jid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || "Couldn't draft a review request right now.");
        return;
      }
      // Log the request so it's tracked.
      const customer = cid ? customers.find((c) => c.id === cid) : null;
      const job = jid ? completeJobs.find((j) => j.id === jid) : null;
      const logRes = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_id: cid,
          customer_name: customer?.name ?? job?.customer_name ?? "",
          job_id: jid,
          request_text: data.message,
        }),
      });
      if (!logRes.ok) {
        const ld = await logRes.json();
        setError(ld.error || "Drafted, but couldn't log the request.");
      }
      setModal({
        title: "Review request",
        subtitle: `For ${customer?.name ?? job?.customer_name ?? "the customer"}`,
        message: data.message,
      });
      router.refresh();
    } catch {
      setError("Couldn't reach the AI service. Check your connection and try again.");
    } finally {
      setDrafting(false);
    }
  }

  async function saveRating(review: Review) {
    setSavingRating(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, review_text: reviewText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save the review.");
        return;
      }
      setRatingFor(null);
      setRating(5);
      setReviewText("");
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSavingRating(false);
    }
  }

  async function remove(review: Review) {
    if (!confirm("Delete this review request record?")) return;
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't delete the record.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  const requested = reviews.filter((r) => r.status === "requested");
  const received = reviews.filter((r) => r.status === "received");

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="card p-6">
        <h3 className="font-display text-base font-bold text-white">Ask for a review</h3>
        <p className="mt-1 text-sm text-slate-400">
          Pick a happy customer — AI drafts the text, you copy it into your messages. The
          request gets logged so you know who you&apos;ve asked.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="r-customer" className="label-dark">Customer</label>
            <select
              id="r-customer"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                if (e.target.value) setJobId("");
              }}
              className="input-dark"
            >
              <option value="">Select…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="r-job" className="label-dark">Completed job (optional)</label>
            <select
              id="r-job"
              value={jobId}
              onChange={(e) => {
                setJobId(e.target.value);
                if (e.target.value) setCustomerId("");
              }}
              className="input-dark"
            >
              <option value="">Select…</option>
              {completeJobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.customer_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={draftRequest} disabled={drafting} className="btn-primary mt-4 text-sm">
          {drafting ? "Drafting…" : "✨ Draft review request"}
        </button>
      </div>

      <section>
        <h3 className="mb-3 font-display text-base font-bold text-white">
          Waiting on reviews ({requested.length})
        </h3>
        {requested.length === 0 ? (
          <p className="card p-6 text-sm text-slate-500">
            Nobody outstanding. Reviews are how the next job finds you — ask after every good one.
          </p>
        ) : (
          <ul className="space-y-2">
            {requested.map((r) => (
              <li key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {r.customer_name}
                    {r.job_title ? ` — ${r.job_title}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Asked {new Date(r.requested_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setRatingFor(ratingFor === r.id ? null : r.id)}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    Log received review
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
                {ratingFor === r.id && (
                  <div className="w-full rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center gap-3">
                      <label htmlFor={`rating-${r.id}`} className="text-sm text-slate-300">
                        Stars
                      </label>
                      <select
                        id={`rating-${r.id}`}
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} ★
                          </option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      rows={2}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Paste what they wrote (optional)"
                      className="input-dark mt-3"
                    />
                    <button
                      onClick={() => saveRating(r)}
                      disabled={savingRating}
                      className="btn-primary mt-3 !py-2 text-sm"
                    >
                      {savingRating ? "Saving…" : "Save review"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-base font-bold text-white">
          Reviews received ({received.length})
        </h3>
        {received.length === 0 ? (
          <p className="card p-6 text-sm text-slate-500">No reviews logged yet.</p>
        ) : (
          <ul className="space-y-2">
            {received.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{r.customer_name}</p>
                  <StatusBadge status={r.status} />
                </div>
                {r.rating && (
                  <p className="mt-1 text-amber-300">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </p>
                )}
                {r.review_text && (
                  <p className="mt-2 text-sm italic text-slate-400">“{r.review_text}”</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {modal && (
        <MessageModal
          title={modal.title}
          subtitle={modal.subtitle}
          message={modal.message}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
