import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { destroySession, verifyPassword } from "@/lib/auth";
import { deleteAccount, getPasswordHashById } from "@/lib/store";
import { badRequest, readJson } from "@/lib/validate";

/**
 * DELETE /api/settings/account — close the account for good.
 * Body: { password, confirm: "DELETE" }
 *
 * Two independent confirmations because this is irreversible and cascades:
 * the password proves it's the account holder, and the typed word proves
 * they meant this button rather than the one next to it. Every customer,
 * quote, invoice, job and review goes with it.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const b = body as { password?: unknown; confirm?: unknown };

  const password = typeof b.password === "string" ? b.password : "";
  const confirm = typeof b.confirm === "string" ? b.confirm.trim() : "";

  if (confirm !== "DELETE") {
    return badRequest('Type DELETE to confirm you want the account closed.');
  }
  if (!password) return badRequest("Enter your password to confirm.");

  try {
    const hash = await getPasswordHashById(auth.user.id);
    if (!hash) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    if (!(await verifyPassword(password, hash))) {
      return NextResponse.json(
        { error: "That password isn't right." },
        { status: 403 }
      );
    }

    // Clear the cookie first: if the delete succeeds, the session row is gone
    // via cascade anyway, and this way the browser is never left holding a
    // cookie that points at a deleted account.
    await destroySession();
    await deleteAccount(auth.user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings/account] delete failed:", err);
    return NextResponse.json(
      { error: "Couldn't close your account right now." },
      { status: 500 }
    );
  }
}
