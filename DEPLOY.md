# Deploying TradeReady

A checklist, in order. Nothing here is optional except where it says so.

## 1. Database

Create a Postgres database (Vercel Postgres, Neon, Supabase — any of them).

Run `lib/schema.sql` against it **once**:

```bash
psql "$POSTGRES_URL" -f lib/schema.sql
```

It is idempotent — every statement is `IF NOT EXISTS`, so re-running it after
a deploy that adds columns is safe and is how you apply future migrations.

## 2. Environment variables

Set these in the Vercel project (Settings → Environment Variables). See
`.env.example` for the full annotated list.

| Variable | Required | What breaks without it |
|---|---|---|
| `POSTGRES_URL` | Yes | Everything. Every route returns an honest 503. |
| `NEXT_PUBLIC_URL` | Yes | Quote share links and password-reset links point at the wrong host. |
| `ANTHROPIC_API_KEY` | No | All five AI drafting features return 503. The rest of the app works. |
| `ANTHROPIC_WORKSPACE_ID` | Only for org-level keys | AI calls fail with "not scoped to a workspace". Not needed if the key was created inside a workspace. |
| `ANTHROPIC_MODEL` | No | Overrides the model. Defaults to `claude-haiku-4-5` (cheapest). `claude-opus-5` gives better quote estimates. |
| `RESEND_API_KEY` | No | Password reset is unavailable (says so honestly). |
| `EMAIL_FROM` | No | Same as above — both are needed together. |

**`NEXT_PUBLIC_URL` is the one people get wrong.** It must be your real
origin with no trailing slash. Quote links are built from it, so a wrong
value sends customers to a dead host.

## 3. Before you make it public

- [ ] Sign up as a real user and walk the four onboarding steps end to end.
- [ ] Send yourself a quote share link and accept it from your phone.
- [ ] Download a quote PDF and check the header — business name, phone,
      contact email, licence number. If they're wrong, fix them in Settings,
      not in the database.
- [ ] Confirm `/forgot` either sends a real email or says it can't.
- [ ] Draft one AI quote and read it — this is the only path that costs money per call.

## 4. Known gaps at launch

These are deliberate, not oversights. Say them out loud rather than letting
a user discover them:

- **No payments.** There is no paid tier and `/pricing` says so plainly.
  Nothing to enforce, nothing to contradict. When a paid plan exists, build
  the checkout before writing the copy.
- **No sending.** The app drafts messages; the contractor copies and sends
  them. Twilio and email delivery are out of scope.
- **Single user per account.** No teams, no roles.
- **No CSP header.** The other security headers are set in
  `next.config.mjs`; a Content-Security-Policy needs per-request nonces in
  middleware and should be done as its own change.

## 5. What's protected

- Passwords: bcrypt cost 12, never stored in plaintext.
- Sessions: 256-bit random tokens, only the SHA-256 hash in the database.
- Password resets: single-use, 1-hour expiry, hashed, and they revoke every
  session on the account.
- Rate limits (Postgres-backed, so they hold across serverless instances):
  login 20/15min per IP and 10/15min per account; signup 5/hour per IP;
  password reset 5/hour per IP and 3/hour per address; public quote replies
  30/hour per IP; AI drafting 40–60/hour **per account** so a free signup
  can't run up the AI bill.
- Quote share links: 256-bit tokens, `noindex` by header and meta, excluded
  in `robots.ts`, and link-preview bots are filtered so they don't register
  as customer views.
- Every authenticated query is scoped to `user_id`. The only unauthenticated
  write is the public quote reply, which is scoped to a single token.

## 6. Seeded demo data

If you ran the Phase 1 verification seed, a demo account exists:

```sql
DELETE FROM users WHERE email = 'phase1-demo@tradeready.local';
```

Everything cascades. Do this before launch — the README's "no fake data"
promise should be true of the production database too.
