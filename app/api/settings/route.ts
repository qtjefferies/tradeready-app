import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { getSettings, updateSettings } from "@/lib/store";
import { badRequest, parseSettings, readJson } from "@/lib/validate";

/** GET /api/settings — the current business profile. */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const settings = await getSettings(auth.user.id);
    if (!settings) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[settings] load failed:", err);
    return NextResponse.json(
      { error: "Couldn't load your settings right now." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings — save the business profile.
 *
 * Deliberately cannot change the login email or password: those are
 * credentials, and they move through their own guarded routes that re-check
 * the current password first.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(req);
  if (body === null) return badRequest("Invalid request body.");
  const parsed = parseSettings(body);
  if ("error" in parsed) return badRequest(parsed.error);

  try {
    const settings = await updateSettings(auth.user.id, parsed.value);
    if (!settings) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }
    return NextResponse.json({ settings });
  } catch (err) {
    console.error("[settings] save failed:", err);
    return NextResponse.json(
      { error: "Couldn't save your settings right now." },
      { status: 500 }
    );
  }
}
