import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./auth";

/**
 * Guard for protected server pages. Returns the logged-in user,
 * otherwise redirects to /login. (requireUser is for API routes,
 * which need a Response object instead.)
 */
export async function requirePageUser(): Promise<SessionUser> {
  let user: SessionUser | null = null;
  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }
  if (!user) redirect("/login");
  return user;
}
