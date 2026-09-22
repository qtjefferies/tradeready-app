"use client";

import { useState } from "react";
import Link from "next/link";

/** Request a reset link. Deliberately says the same thing either way. */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState("");
  const [sent, setSent] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDetail("");
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't start a reset.");
        setDetail(data.detail || "");
        return;
      }
      setSent(data.message);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card p-6 sm:p-8">
        <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
          Check your email
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-bone-300">{sent}</p>
        <p className="mt-3 text-sm text-bone-500">
          Nothing after a few minutes? Check spam, then try again — make sure
          it&apos;s the address you signed up with.
        </p>
        <Link href="/login" className="btn-secondary mt-6 w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
        Reset your password
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-bone-300">
        Enter the email you sign in with and we&apos;ll send you a link.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3"
        >
          <p className="text-[15px] font-semibold text-alert-300">{error}</p>
          {detail && <p className="mt-1 text-sm text-bone-300">{detail}</p>}
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="forgot-email" className="label-dark">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-dark"
          placeholder="you@yourbusiness.com"
        />
      </div>

      <button type="submit" disabled={busy || !email.trim()} className="btn-primary mt-6 w-full">
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <Link href="/login" className="btn-ghost mt-3 w-full">
        Back to sign in
      </Link>
    </form>
  );
}
