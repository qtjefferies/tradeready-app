"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/** Set a new password from a reset link. */
export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't reset your password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-6 text-center sm:p-8">
        <h2 className="font-display text-2xl uppercase tracking-wide text-money-300">
          Password updated
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-bone-300">
          Any device that was signed in has been signed out. Taking you to sign
          in…
        </p>
        <Link href="/login" className="btn-primary mt-6 w-full">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 sm:p-8">
      <h2 className="font-display text-2xl uppercase tracking-wide text-paper">
        Choose a new password
      </h2>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300"
        >
          {error}
        </p>
      )}

      <div className="mt-5">
        <label htmlFor="reset-pw" className="label-dark">
          New password
        </label>
        <input
          id="reset-pw"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-dark"
        />
        <p className="mt-1.5 text-sm text-bone-500">At least 8 characters.</p>
      </div>

      <div className="mt-4">
        <label htmlFor="reset-pw2" className="label-dark">
          Repeat new password
        </label>
        <input
          id="reset-pw2"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="input-dark"
        />
      </div>

      <button type="submit" disabled={busy || !password} className="btn-primary mt-6 w-full">
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
