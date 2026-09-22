import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Send yourself a password reset link.",
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <ForgotPasswordForm />
    </div>
  );
}
