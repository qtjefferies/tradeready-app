"use client";

import { useState } from "react";

/**
 * MessageModal — shows an AI-drafted message (follow-up, reminder, review
 * request) with a copy button. Nothing is sent anywhere — the contractor
 * copies it into their own texts.
 */
export default function MessageModal({
  title,
  subtitle,
  message,
  onClose,
}: {
  title: string;
  subtitle: string;
  message: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Clipboard may be unavailable; select-all fallback below still works.
      const el = document.getElementById("ai-message-text");
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="card w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        <p
          id="ai-message-text"
          className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-slate-200"
        >
          {message}
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Drafted by AI — read it over, tweak anything, then paste it into your
          own text message. Nothing is sent automatically.
        </p>
        <div className="mt-4 flex gap-3">
          <button onClick={copy} className="btn-primary flex-1 !py-2.5 text-sm">
            {copied ? "Copied ✓" : "Copy message"}
          </button>
          <button onClick={onClose} className="btn-secondary !py-2.5 text-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
