-- TradeReady — Postgres schema.
--
-- Run this ONCE in the Vercel dashboard (Storage → your Postgres database →
-- Query) after connecting the database to the project. POSTGRES_URL is
-- auto-injected by Vercel; every API route returns an honest "not configured"
-- error until it exists.
--
-- Nothing here fabricates data — every row is created by a real user action.

-- User accounts. Passwords are stored ONLY as bcrypt hashes — never plaintext.
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  trade TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- Login sessions. The token stored here is the SHA-256 hex of the random
-- token kept in the user's httpOnly cookie, so a database read alone cannot
-- impersonate a session.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- Customers: every homeowner / property manager / GC the user works for.
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customers_user_idx ON customers (user_id, name);

-- Equipment / install records: what was installed, where, when. The
-- retention moat — "that water heater is 9 years old, time to replace it."
CREATE TABLE IF NOT EXISTS equipment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  installed_at DATE,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS equipment_customer_idx ON equipment (customer_id);

-- Quotes. line_items is JSONB: [{description, qty, unit_price, kind}]
-- where kind is "labor" or "materials".
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers (id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  trade TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'declined')),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tax_pct NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  valid_until DATE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS quotes_user_idx ON quotes (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS quotes_customer_idx ON quotes (customer_id);

-- Invoices. Can be created from an accepted quote (quote_id) or standalone.
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers (id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  quote_id INTEGER REFERENCES quotes (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'unpaid', 'sent', 'overdue', 'paid')),
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  tax_pct NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  due_at DATE,
  paid_at DATE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invoices_user_idx ON invoices (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS invoices_customer_idx ON invoices (customer_id);

-- Scheduled jobs: the work calendar that feeds the daily briefing.
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers (id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  quote_id INTEGER REFERENCES quotes (id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'complete', 'cancelled')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS jobs_user_idx ON jobs (user_id, scheduled_at);
CREATE INDEX IF NOT EXISTS jobs_customer_idx ON jobs (customer_id);

-- Review requests: sent after a job completes; tracks requested → received.
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers (id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  job_id INTEGER REFERENCES jobs (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'received')),
  request_text TEXT NOT NULL DEFAULT '',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT NOT NULL DEFAULT '',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reviews_user_idx ON reviews (user_id, requested_at DESC);

-- ===================================================================
-- Phase 1 migration — customer-facing quote links + the money engine.
--
-- Safe to re-run: every statement is IF NOT EXISTS. Existing installs
-- should paste this block into the Vercel Postgres query console; fresh
-- installs get it as part of running this file top to bottom.
-- ===================================================================

-- Shareable quote links. `public_token` is a 256-bit random value, base64url
-- encoded — the capability to open one quote and nothing else. NULL until the
-- contractor generates a link, so old quotes stay unshared by default.
-- (A UNIQUE INDEX rather than a UNIQUE constraint: Postgres allows many NULLs
-- in a unique index, which is exactly what "not shared yet" needs.)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS public_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS quotes_public_token_idx ON quotes (public_token);

-- When the customer actually opened the link. This is what finally makes the
-- 'viewed' status real — until now nothing could set it except the contractor
-- guessing from a dropdown.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- When the customer accepted or declined from the public page, and why they
-- declined if they said. `responded_at` also locks the link: a quote that has
-- been answered can't be answered twice.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS decline_reason TEXT NOT NULL DEFAULT '';

-- Follow-up log. Counting nudges is what eventually answers "do my follow-ups
-- actually win work?" — the win-rate screen reports it only once there are
-- enough decided quotes on both sides to mean anything.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS followup_sent_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS followup_count INTEGER NOT NULL DEFAULT 0;

-- Billing plan. Phase 1 writes these columns but gates nothing — the paywall
-- lands in phase 2. Every existing account reads as 'free'.
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- The money engine reads accepted quotes that never became an invoice, and
-- equipment old enough to be worth a replacement call. Both want an index.
CREATE INDEX IF NOT EXISTS quotes_user_status_idx ON quotes (user_id, status);
CREATE INDEX IF NOT EXISTS invoices_quote_idx ON invoices (quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS equipment_user_installed_idx ON equipment (user_id, installed_at);

-- ===================================================================
-- Settings migration — an editable business profile.
--
-- Until now every one of these lived only on the signup form, which made
-- them write-once: a phone number typo'd at signup printed on every invoice
-- the account ever produced, with no way to correct it.
--
-- Safe to re-run.
-- ===================================================================

-- The address customers should actually use. `users.email` is the LOGIN
-- identifier and must not be published on paperwork or on a public quote
-- page; this is the one that goes to customers. Blank falls back to nothing
-- shown, never to the login address.
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '';

-- Business details that belong on a quote or invoice.
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT '';

-- Contractor license number. Several US states (CA, NV, AZ, FL among them)
-- require it to appear on written estimates and invoices, and a contractor
-- who can't put it on their paperwork can't use the app for real work.
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT NOT NULL DEFAULT '';

-- Defaults applied to new documents, so the same numbers aren't retyped on
-- every quote. Stored as the user's own preference, never guessed.
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_tax_pct NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_payment_terms_days INTEGER NOT NULL DEFAULT 14;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_quote_notes TEXT NOT NULL DEFAULT '';

-- Password reset tokens. Only the SHA-256 hash is stored, the same way
-- sessions work — a database read alone can't reset anybody's password.
-- Single use: `used_at` is stamped the moment a reset succeeds.
CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id);
CREATE INDEX IF NOT EXISTS password_resets_expires_idx ON password_resets (expires_at);

-- ===================================================================
-- Rate limiting.
--
-- Postgres-backed rather than in-memory, because serverless functions don't
-- share memory: a counter held in one instance's RAM is invisible to the next
-- request, which makes an in-process limiter close to decorative.
--
-- Safe to re-run.
-- ===================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON rate_limits (window_start);
