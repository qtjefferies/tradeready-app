"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconCopy, IconEye, IconLink } from "./icons";
import type { QuoteStatus } from "@/lib/store";
import { useConfirm } from "./ConfirmDialog";

/**
 * Share-link controls on the quote editor.
 *
 * The link is what turns a quote from a PDF into something the customer can
 * answer with one tap — and it's the only way the app ever learns whether a
 * quote was opened at all, which the win-rate screen needs to tell a pricing
 * problem apart from a delivery problem.
 */
export default function QuoteShareLink({
  quoteId,
  status,
  initialToken,
  viewedAt,
  respondedAt,
}: {
  quoteId: number;
  status: QuoteStatus;
  initialToken: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [token, setToken] = useState<string | null>(initialToken);
  const [origin, setOrigin] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Built from the live origin rather than the configured site URL, so the
  // link a contractor copies in local development actually opens.
  useEffect(() => setOrigin(window.location.origin), []);
  const url = token ? `${origin}/q/${token}` : "";

  const isDraft = status === "draft";

  async function createLink() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't create a share link.");
        return;
      }
      setToken(data.token);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    const ok = await confirm({
      title: "Turn off this link?",
      body: "Anyone you've already sent it to gets a 'not found' page. Sharing again later creates a different link — the old one stays dead.",
      confirmLabel: "Turn it off",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't turn off the link.");
        return;
      }
      setToken(null);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically — select the link above and copy it.");
    }
  }

  return (
    <div className="mt-6 border-t-2 border-ink-600 pt-5">
      <div className="flex items-center gap-2">
        <IconLink className="h-4 w-4 text-safety-300" />
        <h4 className="font-display text-lg uppercase tracking-wide text-paper">
          Share link
        </h4>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-3 py-2 text-sm font-semibold text-alert-300"
        >
          {error}
        </p>
      )}

      {!token ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-bone-400">
            {isDraft
              ? "Mark this quote as sent first — a draft link would show your customer a price you haven't finished."
              : "A page your customer can open on their phone and accept with one tap. No PDF, no app, no login."}
          </p>
          <button
            onClick={createLink}
            disabled={busy || isDraft}
            className="btn-primary mt-4 w-full text-base"
          >
            {busy ? "Creating…" : "Create share link"}
          </button>
        </>
      ) : (
        <>
          <p className="mt-3 break-all rounded-xl border-2 border-ink-600 bg-ink-900 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-bone-300">
            {url || "…"}
          </p>

          <div className="mt-3 flex flex-col gap-2">
            <button onClick={copy} disabled={!url} className="btn-primary w-full text-base">
              {copied ? (
                <>
                  <IconCheck className="h-5 w-5" /> Copied
                </>
              ) : (
                <>
                  <IconCopy className="h-5 w-5" /> Copy link
                </>
              )}
            </button>
            <a
              href={`/q/${token}?preview=1`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary w-full text-base"
            >
              <IconEye className="h-4 w-4" /> Preview as customer
            </a>
          </div>

          {/* What the link has told us so far. */}
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-bone-500">Opened</dt>
              <dd className={viewedAt ? "font-semibold text-grape-300" : "text-bone-500"}>
                {viewedAt ? new Date(viewedAt).toLocaleString() : "Not yet"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-bone-500">Answered</dt>
              <dd className={respondedAt ? "font-semibold text-money-300" : "text-bone-500"}>
                {respondedAt ? new Date(respondedAt).toLocaleString() : "Not yet"}
              </dd>
            </div>
          </dl>

          <button
            onClick={revoke}
            disabled={busy}
            className="btn-ghost mt-3 w-full !text-bone-400 hover:!text-alert-300"
          >
            {busy ? "Working…" : "Turn off this link"}
          </button>
        </>
      )}
    </div>
  );
}
