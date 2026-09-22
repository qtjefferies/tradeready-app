import { NextRequest, NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { createUser, findUserByEmail } from "@/lib/store";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * POST /api/auth/signup — create an account (email + password + business profile).
 *
 * Passwords are bcrypt-hashed; the raw password never touches the database.
 * On success a session cookie is set and the user is logged in immediately.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const limit = await rateLimit(`signup:ip:${clientIp(req)}`, 5, 3600);
  if (!limit.allowed) {
    return tooManyRequests(limit, "Too many accounts created from here. Try again later.");
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Accounts aren't available yet — the database isn't connected. Your details were not saved.",
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

  const b = body as {
    email?: unknown;
    password?: unknown;
    businessName?: unknown;
    trade?: unknown;
    phone?: unknown;
  };
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  const businessName =
    typeof b.businessName === "string" ? b.businessName.trim().slice(0, 120) : "";
  const trade = typeof b.trade === "string" ? b.trade.trim().slice(0, 80) : "";
  const phone = typeof b.phone === "string" ? b.phone.trim().slice(0, 40) : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (password.length > 128) {
    return NextResponse.json(
      { error: "Password is too long (max 128 characters)." },
      { status: 400 }
    );
  }
  if (!businessName) {
    return NextResponse.json(
      { error: "Please tell us your business name — it goes on your quotes and invoices." },
      { status: 400 }
    );
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser(email, passwordHash, businessName, trade, phone);
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
    console.error("[auth/signup] failed:", err);
    return NextResponse.json(
      { error: "Couldn't create your account right now. Please try again." },
      { status: 500 }
    );
  }
}
