import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create your TradeReady account — your AI office manager for the trades.",
};

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-white">Get your office in order</h1>
      <p className="mt-2 text-sm text-slate-400">
        Create your account. Five minutes, then quote from the driveway.
      </p>
      <div className="card mt-8 p-6">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
