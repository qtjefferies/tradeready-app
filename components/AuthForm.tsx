"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * AuthForm — shared signup / login form. Signup also collects the business
 * profile (business name, trade, phone) that goes on quotes and invoices.
 */
export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || password.length === 0) {
      setPhase("error");
      setError("Please enter your email and password.");
      return;
    }
    if (isSignup && password.length < 8) {
      setPhase("error");
      setError("Password must be at least 8 characters.");
      return;
    }
    if (isSignup && !businessName.trim()) {
      setPhase("error");
      setError("Your business name goes on every quote and invoice — please add it.");
      return;
    }
    setPhase("loading");
    setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isSignup
            ? {
                email: email.trim(),
                password,
                businessName: businessName.trim(),
                trade: trade.trim(),
                phone: phone.trim(),
              }
            : { email: email.trim(), password }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setPhase("error");
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setPhase("error");
      setError("Couldn't reach the server. Check your connection and try again.");
    }
  }

  const trades = [
    "Plumbing",
    "Electrical",
    "HVAC",
    "General contracting",
    "Roofing",
    "Landscaping",
    "Painting",
    "Carpentry",
    "Concrete / Masonry",
    "Other",
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="auth-email" className="label-dark">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourbusiness.com"
          className="input-dark"
        />
      </div>
      <div>
        <label htmlFor="auth-password" className="label-dark">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
          className="input-dark"
        />
      </div>

      {isSignup && (
        <>
          <div>
            <label htmlFor="auth-business" className="label-dark">
              Business name
            </label>
            <input
              id="auth-business"
              type="text"
              autoComplete="organization"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Smith & Sons Plumbing"
              className="input-dark"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="auth-trade" className="label-dark">
                Trade
              </label>
              <select
                id="auth-trade"
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="input-dark"
              >
                <option value="">Select…</option>
                {trades.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="auth-phone" className="label-dark">
                Business phone
              </label>
              <input
                id="auth-phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="input-dark"
              />
            </div>
          </div>
        </>
      )}

      {phase === "error" && error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={phase === "loading"} className="btn-primary w-full">
        {phase === "loading"
          ? isSignup
            ? "Creating your account…"
            : "Logging in…"
          : isSignup
            ? "Create account"
            : "Log in"}
      </button>

      <p className="text-center text-sm text-slate-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-amber-300 hover:text-amber-200">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-amber-300 hover:text-amber-200">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
