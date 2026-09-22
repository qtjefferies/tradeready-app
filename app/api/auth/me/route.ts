import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";

/** GET /api/auth/me — the logged-in user, or { user: null }. */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ user: null });
  }
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
