import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { sql } from "@vercel/postgres";
import { isDatabaseConfigured } from "./db";

/**
 * Authentication: email + password accounts with bcrypt hashes and
 * database-backed sessions. No external auth provider.
 *
 * - Passwords are hashed with bcrypt (cost 12). Plaintext is never stored.
 * - Sessions are random 256-bit tokens. The cookie holds the raw token;
 *   the database holds only its SHA-256 hash, so a DB read alone cannot
 *   impersonate a user.
 * - Cookies are httpOnly, SameSite=Lax, Secure in production, 30-day expiry.
 */

export const SESSION_COOKIE = "tr_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BCRYPT_COST = 12;

export interface SessionUser {
  id: number;
  email: string;
  businessName: string;
  trade: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/** Create a session for a user and set the cookie. */
export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash}, ${userId}, ${expiresAt.toISOString()})
  `;

  const store = cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

/** Destroy the current session (cookie + DB row). Safe to call logged-out. */
export async function destroySession(): Promise<void> {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && isDatabaseConfigured()) {
    try {
      await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
    } catch {
      // Session cleanup is best-effort; the cookie is cleared regardless.
    }
  }
  store.delete(SESSION_COOKIE);
}

/**
 * Return the logged-in user, or null. Also lazily sweeps expired sessions
 * (best-effort).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!isDatabaseConfigured()) return null;
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const result = await sql`
      SELECT u.id, u.email, u.business_name, u.trade, s.expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ${hashToken(token)}
      LIMIT 1
    `;
    const row = result.rows[0] as
      | {
          id: number;
          email: string;
          business_name: string;
          trade: string;
          expires_at: string;
        }
      | undefined;
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
      cookies().delete(SESSION_COOKIE);
      return null;
    }
    // Best-effort sweep of other expired sessions.
    sql`DELETE FROM sessions WHERE expires_at < NOW()`.catch(() => {});
    return {
      id: row.id,
      email: row.email,
      businessName: row.business_name || "",
      trade: row.trade || "",
    };
  } catch {
    return null;
  }
}
