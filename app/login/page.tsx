import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your TradeReady account.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-white">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-400">
        Log in to see your morning briefing.
      </p>
      <div className="card mt-8 p-6">
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
