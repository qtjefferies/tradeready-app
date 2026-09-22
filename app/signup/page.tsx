import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create your TradeReady account — your AI office manager for the trades.",
};

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl uppercase leading-[1.02] tracking-wide text-paper sm:text-5xl">
          Get your office <span className="text-safety-400">in order</span>
        </h1>
        <div className="hazard mx-auto mt-5 h-1.5 w-28 rounded-full" aria-hidden="true" />
        <p className="mt-4 text-[15px] text-bone-300">
          Create your account. Five minutes, then quote from the driveway.
        </p>
      </div>
      <div className="card mt-8 overflow-hidden">
        <div className="hazard h-2" aria-hidden="true" />
        <div className="p-6 sm:p-8">
          <AuthForm mode="signup" />
        </div>
      </div>
    </div>
  );
}
