import { NextRequest, NextResponse } from "next/server";
import { createPasswordReset } from "@/lib/auth";
import { emailConfigured, resetEmail, sendEmail } from "@/lib/email";
import { isDatabaseConfigured } from "@/lib/db";
import { badRequest, readJson } from "@/lib/validate";
import { siteUrl } from "@/lib/site";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/auth/forgot — start a password reset.
 * Body: { email }
 *
 * ALWAYS answers the same way whether or not the address has an account.
 * Saying "no account with that email" turns this endpoint into a way to test
 * whether someone is a customer, which is a privacy leak and the first step
 * of a credential-stuffing run.
 */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Accounts aren't available — the database isn't connected." },
      { status: 503 }
    );
  }

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { email?: unknown };
  const email =
    typeof b.email === "string" ? b.email.trim().toLowerCase().slice(0, 254) : "";
  if (!email) return badRequest("Enter the email you sign in with.");

  // Reset mail is the easiest thing here to weaponise: uncapped, it lets
  // anyone flood a competitor's inbox and burn the sending quota doing it.
  const ipLimit = await rateLimit(`forgot:ip:${clientIp(req)}`, 5, 3600);
  if (!ipLimit.allowed) {
    return tooManyRequests(ipLimit, "Too many reset requests. Try again later.");
  }
  const emailLimit = await rateLimit(`forgot:email:${email}`, 3, 3600);
  if (!emailLimit.allowed) {
    return tooManyRequests(emailLimit, "Too many reset requests for that address. Try again later.");
  }

  // Said regardless of outcome. See the note above.
  const neutral = {
    ok: true,
    message:
      "If there's an account with that email, a reset link is on its way. It expires in an hour.",
  };

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error: "Password reset isn't available yet",
        detail:
          "This deployment has no email provider configured, so no reset link can be sent. Contact support and we'll sort it out by hand.",
      },
      { status: 503 }
    );
  }

  try {
    const created = await createPasswordReset(email);
    if (created) {
      const url = `${siteUrl.replace(/\/$/, "")}/reset?token=${created.token}`;
      const { subject, text } = resetEmail(url);
      await sendEmail({ to: email, subject, text });
    }
    return NextResponse.json(neutral);
  } catch (err) {
    console.error("[auth/forgot] failed:", err);
    // Still neutral: a send failure must not reveal that the account exists.
    return NextResponse.json(neutral);
  }
}
