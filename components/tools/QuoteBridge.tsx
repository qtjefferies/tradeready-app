"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveToolQuote, type ToolQuotePayload } from "@/lib/toolQuote";

/**
 * The engraining loop: every calculator ends with "Turn into a quote →",
 * which saves the calculation and drops the contractor into a pre-filled
 * quote draft. "Copy result" makes the number shareable for inbound traffic.
 */
export default function QuoteBridge({
  buildPayload,
  resultText,
  quoteLabel = "Turn into a quote",
}: {
  buildPayload: () => ToolQuotePayload | null;
  resultText: string;
  quoteLabel?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [linked, setLinked] = useState(false);
  const payload = buildPayload();

  async function writeClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* clipboard unavailable */
      }
      ta.remove();
    }
  }

  async function shareLink() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: document.title, text: resultText, url });
        return;
      } catch {
        /* dismissed — fall through to copy */
      }
    }
    await writeClipboard(url);
    setLinked(true);
    window.setTimeout(() => setLinked(false), 2000);
  }

  async function copy() {
    await writeClipboard(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function toQuote() {
    const p = buildPayload();
    if (!p) return;
    saveToolQuote(p);
    router.push("/dashboard/quotes/new");
  }

  return (
    <div className="mt-6 print:hidden">
      <div className="hazard h-1.5 rounded-full opacity-70" aria-hidden="true" />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={toQuote}
          disabled={!payload}
          className="btn-primary flex-1 font-display text-lg uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40"
        >
          {quoteLabel} →
        </button>
        <button type="button" onClick={copy} className="btn-secondary sm:w-auto">
          {copied ? "Copied!" : "Copy result"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={shareLink} className="btn-ghost">
          {linked ? "Link copied!" : "Share link to this result"}
        </button>
        <button type="button" onClick={() => window.print()} className="btn-ghost">
          Print / save as PDF
        </button>
      </div>
      <p className="mt-2.5 text-center text-xs text-bone-500 sm:text-left">
        No account needed. The link carries your inputs, so whoever opens it sees this exact result.{" "}
        {quoteLabel} drops the numbers into a quote draft — sign in or create your free account when you&rsquo;re ready.
      </p>
    </div>
  );
}
