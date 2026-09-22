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
