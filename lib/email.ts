import { siteName } from "./site";

/**
 * Transactional email.
 *
 * Follows the same rule as the AI helper: when the provider isn't
 * configured, callers get an honest "not configured" answer rather than a
 * silent success. A password reset that reports "check your inbox" when no
 * mail was ever sent is worse than one that admits it can't send — the user
 * would sit waiting for a mail that isn't coming.
 *
 * Resend is the provider because it needs one env var and no SDK. Swapping it
 * for SES or Postmark means changing `send` and nothing else.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Deliverability is better and trades read texts, not HTML. */
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!emailConfigured()) {
    throw Object.assign(
      new Error("Email isn't configured on this deployment."),
      { status: 503 }
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("[email] send failed:", res.status, detail.slice(0, 400));
    throw Object.assign(new Error("Couldn't send the email."), { status: 502 });
  }
}

/** The password-reset email body. Plain, short, no marketing. */
export function resetEmail(resetUrl: string): { subject: string; text: string } {
  return {
    subject: `Reset your ${siteName} password`,
    text: `Someone asked to reset the password on your ${siteName} account.

Open this link to set a new one:

${resetUrl}

The link works once and expires in 1 hour.

If this wasn't you, ignore this email — your password hasn't changed and nobody got into your account.`,
  };
}
