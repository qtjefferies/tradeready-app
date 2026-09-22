import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { isDatabaseConfigured, sql } from "./db";

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

/**
 * Drop every session for a user except the one making the request.
 *
 * Called after a password change: if the password was changed because it
 * leaked, leaving the attacker's session alive would make the change
 * pointless. The current device stays logged in so the user isn't kicked out
 * of the screen they're standing on.
 */
export async function revokeOtherSessions(userId: number): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const keep = token ? hashToken(token) : "";
  try {
    if (keep) {
      await sql`DELETE FROM sessions WHERE user_id = ${userId} AND token_hash <> ${keep}`;
    } else {
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
    }
  } catch {
    // Best effort — never block the password change itself.
  }
}

/** Drop every session for a user, including the current one. */
export async function revokeAllSessions(userId: number): Promise<void> {
  try {
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
  } catch {
    // Best effort.
  }
}

/**
 * Password strength floor, shared by signup, change and reset so all three
 * agree. Length is the requirement that actually matters; composition rules
 * mostly push people toward `Password1!`.
 */
export function passwordProblem(password: string): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "Use at least 8 characters.";
  }
  if (password.length > 200) {
    return "That password is too long.";
  }
  return null;
}

// --------------------------------------------------- password resets

/** How long a reset link stays good. Short: it's sitting in an inbox. */
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Mint a reset token for an email address, or null when no such account
 * exists. Only the SHA-256 hash is stored, so a database read can't be turned
 * into a password reset.
 *
 * Any unused tokens for the account are cleared first: requesting a new link
 * should invalidate the old one, or a stolen earlier email stays live.
 */
export async function createPasswordReset(email: string): Promise<
  { token: string; userId: number } | null
> {
  const r = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  const row = r.rows[0] as { id: number } | undefined;
  if (!row) return null;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await sql`DELETE FROM password_resets WHERE user_id = ${row.id} AND used_at IS NULL`;
  await sql`
    INSERT INTO password_resets (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${row.id}, ${expiresAt.toISOString()})
  `;
  return { token, userId: row.id };
}

/**
 * Consume a reset token and set the new password.
 *
 * The token is marked used inside the same statement that claims it
 * (`used_at IS NULL` in the WHERE), so two simultaneous submissions can't
 * both succeed. Every session is dropped afterwards: whoever forced the
 * reset shouldn't stay logged in on another device.
 */
export async function consumePasswordReset(
  token: string,
  newPasswordHash: string
): Promise<boolean> {
  if (!token) return false;

  const claimed = await sql`
    UPDATE password_resets
    SET used_at = NOW()
    WHERE token_hash = ${hashToken(token)}
      AND used_at IS NULL
      AND expires_at > NOW()
    RETURNING user_id
  `;
  const row = claimed.rows[0] as { user_id: number } | undefined;
  if (!row) return false;

  await sql`UPDATE users SET password_hash = ${newPasswordHash} WHERE id = ${row.user_id}`;
  await revokeAllSessions(row.user_id);
  // Best-effort tidy of anything already expired.
  sql`DELETE FROM password_resets WHERE expires_at < NOW()`.catch(() => {});
  return true;
}

/** Is this token still good? Used to show the form or an expired notice. */
export async function resetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const r = await sql`
      SELECT 1 FROM password_resets
      WHERE token_hash = ${hashToken(token)}
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `;
    return r.rows.length > 0;
  } catch {
    return false;
  }
}
