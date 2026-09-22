# TradeReady — your office manager, in your pocket

Full-stack Next.js 14 app for trades professionals (plumbing, electrical, HVAC,
GC, roofing, landscaping, painting, carpentry).

**The lifecycle:** quote → invoice → paid → reviewed → repeat customer.
**The daily habit:** a morning briefing showing quotes to follow up, overdue
invoices, today's jobs, and reviews to ask for.

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
- **AI:** Google Gemini, server-side only. No `GEMINI_API_KEY` → honest 503,
  never fabricated output.
- **No fake data, no fabricated testimonials or metrics.** No auto-sent
  texts/emails (Twilio deliberately out of scope for MVP).

## Quickstart

```bash
npm install
cp .env.example .env   # fill in POSTGRES_URL and GEMINI_API_KEY
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
- `GEMINI_API_KEY` — Google AI Studio key for the AI drafting features

## Deployment (Vercel + Vercel Postgres)

1. Create a Vercel Postgres database; copy its connection string into
   `POSTGRES_URL`.
2. In the database, run `lib/schema.sql` once (tables: users, sessions,
   customers, equipment, quotes, invoices, jobs, reviews).
3. Set `GEMINI_API_KEY` from Google AI Studio.
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
- No payments/processing.
