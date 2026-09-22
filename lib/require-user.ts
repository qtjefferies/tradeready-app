import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { isDatabaseConfigured } from "./db";

/**
 * Guard for protected API routes. Returns { user } when a valid session
 * exists, otherwise { response } — a 503 when the database isn't connected
 * (honest: nothing was saved) or a 401 when the caller isn't logged in.
 */
export async function requireUser(): Promise<
  { user: SessionUser } | { response: NextResponse }
> {
  if (!isDatabaseConfigured()) {
    return {
      response: NextResponse.json(
        {
          error:
            "Accounts aren't available yet — the database isn't connected. Nothing was saved.",
        },
        { status: 503 }
      ),
    };
  }
  const user = await getSessionUser();
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      ),
    };
  }
  return { user };
}
