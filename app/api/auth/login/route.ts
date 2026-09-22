import { NextRequest, NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { findUserByEmail, getPasswordHash } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/auth/login — log in with email + password.
 * Generic "invalid credentials" response either way (no email enumeration).
 */
export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Accounts aren't available yet — the database isn't connected. Nothing was saved.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const b = body as { email?: unknown; password?: unknown };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Two buckets: the IP stops one machine spraying many accounts, the email
  // stops a botnet grinding one account from many machines.
  const ipLimit = await rateLimit(`login:ip:${clientIp(req)}`, 20, 900);
  if (!ipLimit.allowed) {
    return tooManyRequests(ipLimit, "Too many sign-in attempts. Wait a few minutes and try again.");
  }
  const emailLimit = await rateLimit(`login:email:${email}`, 10, 900);
  if (!emailLimit.allowed) {
    return tooManyRequests(emailLimit, "Too many sign-in attempts on this account. Wait a few minutes and try again.");
  }

  try {
    const user = await findUserByEmail(email);
    const hash = user ? await getPasswordHash(email) : null;
    const ok = hash ? await verifyPassword(password, hash) : false;
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await createSession(user.id);
    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        businessName: user.business_name,
        trade: user.trade,
      },
    });
  } catch (err) {
    console.error("[auth/login] failed:", err);
    return NextResponse.json(
      { error: "Couldn't log you in right now. Please try again." },
      { status: 500 }
    );
  }
}
