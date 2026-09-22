import { NextRequest, NextResponse } from "next/server";
import { consumePasswordReset, hashPassword, passwordProblem } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { badRequest, readJson } from "@/lib/validate";

/**
 * POST /api/auth/reset — finish a password reset.
 * Body: { token, password }
 *
 * The token is single-use and expires in an hour. Success drops every session
 * on the account, so the person who forced the reset is signed out too.
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
  const b = body as { token?: unknown; password?: unknown };

  const token = typeof b.token === "string" ? b.token : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!token) return badRequest("This reset link is missing its code.");
  const problem = passwordProblem(password);
  if (problem) return badRequest(problem);

  try {
    const ok = await consumePasswordReset(token, await hashPassword(password));
    if (!ok) {
      return NextResponse.json(
        {
          error:
            "This reset link has expired or already been used. Ask for a new one.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      message: "Password updated. Sign in with your new password.",
    });
  } catch (err) {
    console.error("[auth/reset] failed:", err);
    return NextResponse.json(
      { error: "Couldn't reset your password right now." },
      { status: 500 }
    );
  }
}
