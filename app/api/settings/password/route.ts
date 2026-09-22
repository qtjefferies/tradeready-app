import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import {
  hashPassword,
  passwordProblem,
  revokeOtherSessions,
  verifyPassword,
} from "@/lib/auth";
import { getPasswordHashById, setPasswordHash } from "@/lib/store";
import { badRequest, readJson } from "@/lib/validate";

/**
 * POST /api/settings/password — change the login password.
 * Body: { currentPassword, newPassword }
 *
 * The current password is re-checked even though the caller is already
 * logged in: a session left open on a shared phone shouldn't be enough to
 * take the account over. On success every OTHER session is dropped, so a
 * password changed because it leaked actually locks the other party out.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { currentPassword?: unknown; newPassword?: unknown };

  const currentPassword =
    typeof b.currentPassword === "string" ? b.currentPassword : "";
  const newPassword = typeof b.newPassword === "string" ? b.newPassword : "";

  if (!currentPassword) return badRequest("Enter your current password.");
  const problem = passwordProblem(newPassword);
  if (problem) return badRequest(problem);
  if (newPassword === currentPassword) {
    return badRequest("That's the password you already have — pick a different one.");
  }

  try {
    const hash = await getPasswordHashById(auth.user.id);
    if (!hash) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    const ok = await verifyPassword(currentPassword, hash);
    if (!ok) {
      return NextResponse.json(
        { error: "That current password isn't right." },
        { status: 403 }
      );
    }

    await setPasswordHash(auth.user.id, await hashPassword(newPassword));
    await revokeOtherSessions(auth.user.id);

    return NextResponse.json({
      ok: true,
      message: "Password changed. Any other device you were signed in on has been signed out.",
    });
  } catch (err) {
    console.error("[settings/password] failed:", err);
    return NextResponse.json(
      { error: "Couldn't change your password right now." },
      { status: 500 }
    );
  }
}
