# TradeReady — your office manager, in your pocket

Full-stack Next.js 14 app for trades professionals (plumbing, electrical, HVAC,
GC, roofing, landscaping, painting, carpentry).

**The lifecycle:** quote → invoice → paid → reviewed → repeat customer.
**The daily habit:** a morning briefing showing quotes to follow up, overdue
invoices, today's jobs, and reviews to ask for.
**The edge:** Money Found — the revenue already sitting in records you've
entered, and a win-rate screen that says why you lose the jobs you lose.

## What's inside

- **Auth:** email/password, bcrypt cost 12, random 256-bit session tokens,
  only SHA-256 hashes stored, httpOnly SameSite=Lax cookies, 30-day sessions.
- **Quotes:** AI-drafted line items (labor/material split), tax/discount/live
  totals, statuses (draft → sent → accepted → declined/expired), branded PDFs,
  follow-up queue for quotes gone quiet 2+ days, one-click convert to invoice.
- **Invoices:** due dates, statuses (unpaid/sent/overdue/paid), overdue queue
  with AI-drafted reminders, branded PDFs.
- **Customers:** profiles + full history (quotes, invoices, jobs, equipment
  installs with age visibility, reviews) — the retention moat.
- **Schedule:** jobs with date/time/customer/status; today's jobs feed the briefing.
- **Reviews:** AI-drafted review requests (copy, never auto-sent), requested vs.
  received tracking with star ratings.
- **Share links:** a customer-facing quote page (`/q/[token]`) with one-tap
  accept/decline. 256-bit tokens, `noindex`, link-preview bots filtered so
  they don't count as views. This is what makes the `viewed` status real.
- **Money Found:** unbilled accepted quotes, equipment past service life,
  dormant customers, and stale declines — each priced *only* from the user's
  own past jobs, with the sample size shown. Anything it can't price honestly
  says so and is excluded from the headline total.
- **Win rate:** by price band, labour rate on won vs lost quotes, opened-vs-
  never-opened (a pricing problem and a delivery problem need opposite
  fixes), and follow-up effectiveness. Every rate carries its `n`, and
  anything under the sample floor renders as "not enough data" — never as a
  number someone might reprice their business on.
- **Settings:** editable business profile — contact email kept separate from
  the login email, address, website, contractor licence number, and document
  defaults. Password change and account deletion.
- **Auth recovery:** password reset by emailed single-use token (1-hour
  expiry, revokes all sessions).
- **AI:** Claude (Anthropic), server-side only, with structured outputs so a
  malformed draft can't reach a customer's quote. Defaults to Haiku 4.5 to
  keep a free app affordable; one env var swaps in a stronger model. No
  `ANTHROPIC_API_KEY` → honest 503, never fabricated output.
- **No fake data, no fabricated testimonials or metrics.** No auto-sent
  texts/emails (Twilio deliberately out of scope for MVP).

## Quickstart

```bash
npm install
cp .env.example .env   # fill in POSTGRES_URL and ANTHROPIC_API_KEY
# One-time production setup: run lib/schema.sql against your Postgres database
npm run dev
```

## Scripts

- `npm run dev` — local development
- `npm run lint` — ESLint (must pass)
- `npm run build` — production build (must pass)
- `npm start` — run the production build

## Environment

See `.env.example`:

- `POSTGRES_URL` — Vercel Postgres (or any Postgres) connection string
- `ANTHROPIC_API_KEY` — Anthropic API key for the AI drafting features

## Deployment (Vercel + Vercel Postgres)

1. Create a Vercel Postgres database; copy its connection string into
   `POSTGRES_URL`.
2. In the database, run `lib/schema.sql` once (tables: users, sessions,
   customers, equipment, quotes, invoices, jobs, reviews).
3. Set `ANTHROPIC_API_KEY` from console.anthropic.com.
4. Deploy. No `vercel.json` needed — defaults work.

## Security notes

- All API routes require a session; every read/write is scoped to the
  logged-in `user_id`.
- Line items/tax/discount are validated and re-computed server-side; stored
  totals always win over client math.
- PDF routes require login + ownership.

## Current limits (MVP)

- No automatic SMS/email sending (drafts only, copy to your own messages).
- No team/multi-user accounts — one account per business.
- **No payments.** The app is free and `/pricing` says so. No paid tier, no
  trial, nothing to enforce.
- No Content-Security-Policy header (other security headers are set).

## Deploying

See `DEPLOY.md` for the ordered checklist, the environment variables, and
what's protected.
