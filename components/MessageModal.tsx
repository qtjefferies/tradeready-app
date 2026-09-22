"use client";

import { useState } from "react";
import { IconCheck, IconCopy, IconX } from "./icons";

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
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="card w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hazard h-2" aria-hidden="true" />
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl uppercase tracking-wide text-paper">{title}</h3>
              <p className="mt-1 text-sm text-bone-400">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border-2 border-ink-600 text-bone-400 transition hover:text-paper active:scale-95"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>
          <p
            id="ai-message-text"
            className="mt-5 whitespace-pre-wrap rounded-xl border-2 border-ink-600 bg-ink-900 p-4 text-[15px] leading-relaxed text-bone-200"
          >
            {message}
          </p>
          <p className="mt-3 text-sm text-bone-500">
            Drafted by AI — read it over, tweak anything, then paste it into your
            own text message. Nothing is sent automatically.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={copy} className="btn-primary flex-1 text-base">
              {copied ? (
                <>
                  <IconCheck className="h-5 w-5" /> Copied
                </>
              ) : (
                <>
                  <IconCopy className="h-5 w-5" /> Copy message
                </>
              )}
            </button>
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
