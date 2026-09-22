import { sql } from "@vercel/postgres";
import { normalizeLineItems, type LineItem } from "./money";

/**
 * TradeReady data layer — every query is scoped to a user_id. No cross-user
 * reads are possible through these helpers.
 */

// ---------------------------------------------------------------- users

export interface DbUser {
  id: number;
  email: string;
  business_name: string;
  trade: string;
  phone: string;
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const r = await sql`
    SELECT id, email, password_hash, business_name, trade, phone
    FROM users WHERE email = ${email} LIMIT 1
  `;
  const row = r.rows[0] as
    | (DbUser & { password_hash: string })
    | undefined;
  return row ?? null;
}

export async function getPasswordHash(email: string): Promise<string | null> {
  const r = await sql`SELECT password_hash FROM users WHERE email = ${email} LIMIT 1`;
  const row = r.rows[0] as { password_hash: string } | undefined;
  return row?.password_hash ?? null;
}

export async function createUser(
  email: string,
  passwordHash: string,
  businessName: string,
  trade: string,
  phone: string
): Promise<DbUser> {
  const r = await sql`
    INSERT INTO users (email, password_hash, business_name, trade, phone)
    VALUES (${email}, ${passwordHash}, ${businessName}, ${trade}, ${phone})
    RETURNING id, email, business_name, trade, phone
  `;
  return r.rows[0] as DbUser;
}

export async function getBusinessProfile(
  userId: number
): Promise<{ businessName: string; trade: string; phone: string; email: string }> {
  const r = await sql`
    SELECT business_name, trade, phone, email FROM users WHERE id = ${userId} LIMIT 1
  `;
  const row = r.rows[0] as
    | { business_name: string; trade: string; phone: string; email: string }
    | undefined;
  return {
    businessName: row?.business_name || "",
    trade: row?.trade || "",
    phone: row?.phone || "",
    email: row?.email || "",
  };
}

// ------------------------------------------------------------- customers

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
  job_count?: number;
  total_billed?: number;
}

export async function listCustomers(userId: number): Promise<Customer[]> {
  const r = await sql`
    SELECT c.*, COUNT(DISTINCT j.id)::int AS job_count
    FROM customers c
    LEFT JOIN jobs j ON j.customer_id = c.id AND j.status != 'cancelled'
    WHERE c.user_id = ${userId}
    GROUP BY c.id
    ORDER BY c.name ASC
  `;
  return r.rows as Customer[];
}

export async function getCustomer(
  userId: number,
  id: number
): Promise<Customer | null> {
  const r = await sql`
    SELECT * FROM customers WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  const row = (r.rows[0] as Customer | undefined) ?? null;
  return row;
}

export interface NewCustomer {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export async function createCustomer(
  userId: number,
  c: NewCustomer
): Promise<Customer> {
  const r = await sql`
    INSERT INTO customers (user_id, name, phone, email, address, notes)
    VALUES (${userId}, ${c.name}, ${c.phone || ""}, ${c.email || ""}, ${
    c.address || ""
  }, ${c.notes || ""})
    RETURNING *
  `;
  return r.rows[0] as Customer;
}

export async function updateCustomer(
  userId: number,
  id: number,
  c: Partial<NewCustomer>
): Promise<Customer | null> {
  const existing = await getCustomer(userId, id);
  if (!existing) return null;
  const r = await sql`
    UPDATE customers
    SET name = ${c.name ?? existing.name},
        phone = ${c.phone ?? existing.phone},
        email = ${c.email ?? existing.email},
        address = ${c.address ?? existing.address},
        notes = ${c.notes ?? existing.notes},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return (r.rows[0] as Customer | undefined) ?? null;
}

export async function deleteCustomer(userId: number, id: number): Promise<boolean> {
  const r = await sql`
    DELETE FROM customers WHERE id = ${id} AND user_id = ${userId}
  `;
  return (r.rowCount ?? 0) > 0;
}

// ------------------------------------------------------------- equipment

export interface Equipment {
  id: number;
  customer_id: number;
  description: string;
  installed_at: string | null;
  notes: string;
  created_at: string;
}

export async function listEquipment(
  userId: number,
  customerId: number
): Promise<Equipment[]> {
  const r = await sql`
    SELECT id, customer_id, description, installed_at, notes, created_at
    FROM equipment
    WHERE user_id = ${userId} AND customer_id = ${customerId}
    ORDER BY installed_at DESC NULLS LAST, created_at DESC
  `;
  return r.rows as Equipment[];
}

export async function addEquipment(
  userId: number,
  customerId: number,
  description: string,
  installedAt: string | null,
  notes: string
): Promise<Equipment | null> {
  const customer = await getCustomer(userId, customerId);
  if (!customer) return null;
  const r = await sql`
    INSERT INTO equipment (user_id, customer_id, description, installed_at, notes)
    VALUES (${userId}, ${customerId}, ${description}, ${
    installedAt || null
  }, ${notes})
    RETURNING id, customer_id, description, installed_at, notes, created_at
  `;
  return (r.rows[0] as Equipment | undefined) ?? null;
}

export async function deleteEquipment(
  userId: number,
  customerId: number,
  id: number
): Promise<boolean> {
  const r = await sql`
    DELETE FROM equipment
    WHERE id = ${id} AND user_id = ${userId} AND customer_id = ${customerId}
  `;
  return (r.rowCount ?? 0) > 0;
}

// ----------------------------------------------------------------- quotes

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined";

export interface Quote {
  id: number;
  customer_id: number | null;
  customer_name: string;
  title: string;
  trade: string;
  status: QuoteStatus;
  line_items: LineItem[];
  tax_pct: number;
  discount: number;
  notes: string;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

function toQuote(row: Record<string, unknown>): Quote {
  return {
    id: row.id as number,
    customer_id: (row.customer_id as number | null) ?? null,
    customer_name: (row.customer_name as string) || "",
    title: (row.title as string) || "",
    trade: (row.trade as string) || "",
    status: row.status as QuoteStatus,
    line_items: normalizeLineItems(row.line_items),
    tax_pct: Number(row.tax_pct ?? 0),
    discount: Number(row.discount ?? 0),
    notes: (row.notes as string) || "",
    valid_until: (row.valid_until as string | null) ?? null,
    sent_at: (row.sent_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listQuotes(
  userId: number,
  status?: QuoteStatus
): Promise<Quote[]> {
  const r = status
    ? await sql`SELECT * FROM quotes WHERE user_id = ${userId} AND status = ${status} ORDER BY updated_at DESC`
    : await sql`SELECT * FROM quotes WHERE user_id = ${userId} ORDER BY updated_at DESC`;
  return r.rows.map(toQuote);
}

export async function getQuote(
  userId: number,
  id: number
): Promise<Quote | null> {
  const r = await sql`
    SELECT * FROM quotes WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  const row = r.rows[0];
  return row ? toQuote(row) : null;
}

export interface QuoteInput {
  customer_id?: number | null;
  customer_name: string;
  title: string;
  trade?: string;
  status?: QuoteStatus;
  line_items: LineItem[];
  tax_pct?: number;
  discount?: number;
  notes?: string;
  valid_until?: string | null;
  sent_at?: string | null;
}

export async function createQuote(
  userId: number,
  q: QuoteInput
): Promise<Quote> {
  const r = await sql`
    INSERT INTO quotes (
      user_id, customer_id, customer_name, title, trade, status,
      line_items, tax_pct, discount, notes, valid_until, sent_at
    )
    VALUES (
      ${userId}, ${q.customer_id ?? null}, ${q.customer_name}, ${q.title},
      ${q.trade || ""}, ${q.status || "draft"},
      ${JSON.stringify(normalizeLineItems(q.line_items))}::jsonb,
      ${q.tax_pct ?? 0}, ${q.discount ?? 0}, ${q.notes || ""},
      ${q.valid_until || null}, ${q.sent_at || null}
    )
    RETURNING *
  `;
  return toQuote(r.rows[0]);
}

export async function updateQuote(
  userId: number,
  id: number,
  q: Partial<QuoteInput>
): Promise<Quote | null> {
  const existing = await getQuote(userId, id);
  if (!existing) return null;
  const items =
    q.line_items !== undefined ? normalizeLineItems(q.line_items) : existing.line_items;
  const r = await sql`
    UPDATE quotes
    SET customer_id = ${q.customer_id !== undefined ? q.customer_id : existing.customer_id},
        customer_name = ${q.customer_name ?? existing.customer_name},
        title = ${q.title ?? existing.title},
        trade = ${q.trade ?? existing.trade},
        status = ${q.status ?? existing.status},
        line_items = ${JSON.stringify(items)}::jsonb,
        tax_pct = ${q.tax_pct ?? existing.tax_pct},
        discount = ${q.discount ?? existing.discount},
        notes = ${q.notes ?? existing.notes},
        valid_until = ${q.valid_until !== undefined ? q.valid_until : existing.valid_until},
        sent_at = ${q.sent_at !== undefined ? q.sent_at : existing.sent_at},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  const row = r.rows[0];
  return row ? toQuote(row) : null;
}

export async function deleteQuote(userId: number, id: number): Promise<boolean> {
  const r = await sql`DELETE FROM quotes WHERE id = ${id} AND user_id = ${userId}`;
  return (r.rowCount ?? 0) > 0;
}

/** Quotes sent/viewed more than `days` ago — the follow-up queue. */
export async function listStaleQuotes(
  userId: number,
  days = 2
): Promise<Quote[]> {
  const r = await sql`
    SELECT * FROM quotes
    WHERE user_id = ${userId}
      AND status IN ('sent', 'viewed')
      AND sent_at IS NOT NULL
      AND sent_at < NOW() - (${days} || ' days')::interval
    ORDER BY sent_at ASC
  `;
  return r.rows.map(toQuote);
}

// ---------------------------------------------------------------- invoices

export type InvoiceStatus = "draft" | "unpaid" | "sent" | "overdue" | "paid";

export interface Invoice {
  id: number;
  customer_id: number | null;
  customer_name: string;
  quote_id: number | null;
  title: string;
  status: InvoiceStatus;
  line_items: LineItem[];
  tax_pct: number;
  discount: number;
  notes: string;
  due_at: string | null;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

function toInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as number,
    customer_id: (row.customer_id as number | null) ?? null,
    customer_name: (row.customer_name as string) || "",
    title: (row.title as string) || "",
    quote_id: (row.quote_id as number | null) ?? null,
    status: row.status as InvoiceStatus,
    line_items: normalizeLineItems(row.line_items),
    tax_pct: Number(row.tax_pct ?? 0),
    discount: Number(row.discount ?? 0),
    notes: (row.notes as string) || "",
    due_at: (row.due_at as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    sent_at: (row.sent_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listInvoices(
  userId: number,
  status?: InvoiceStatus
): Promise<Invoice[]> {
  const r = status
    ? await sql`SELECT * FROM invoices WHERE user_id = ${userId} AND status = ${status} ORDER BY updated_at DESC`
    : await sql`SELECT * FROM invoices WHERE user_id = ${userId} ORDER BY updated_at DESC`;
  return r.rows.map(toInvoice);
}

export async function getInvoice(
  userId: number,
  id: number
): Promise<Invoice | null> {
  const r = await sql`
    SELECT * FROM invoices WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  const row = r.rows[0];
  return row ? toInvoice(row) : null;
}

export interface InvoiceInput {
  customer_id?: number | null;
  customer_name: string;
  quote_id?: number | null;
  title: string;
  status?: InvoiceStatus;
  line_items: LineItem[];
  tax_pct?: number;
  discount?: number;
  notes?: string;
  due_at?: string | null;
  paid_at?: string | null;
  sent_at?: string | null;
}

export async function createInvoice(
  userId: number,
  inv: InvoiceInput
): Promise<Invoice> {
  const r = await sql`
    INSERT INTO invoices (
      user_id, customer_id, customer_name, quote_id, title, status,
      line_items, tax_pct, discount, notes, due_at, paid_at, sent_at
    )
    VALUES (
      ${userId}, ${inv.customer_id ?? null}, ${inv.customer_name},
      ${inv.quote_id ?? null}, ${inv.title}, ${inv.status || "draft"},
      ${JSON.stringify(normalizeLineItems(inv.line_items))}::jsonb,
      ${inv.tax_pct ?? 0}, ${inv.discount ?? 0}, ${inv.notes || ""},
      ${inv.due_at || null}, ${inv.paid_at || null}, ${inv.sent_at || null}
    )
    RETURNING *
  `;
  return toInvoice(r.rows[0]);
}

export async function updateInvoice(
  userId: number,
  id: number,
  inv: Partial<InvoiceInput>
): Promise<Invoice | null> {
  const existing = await getInvoice(userId, id);
  if (!existing) return null;
  const items =
    inv.line_items !== undefined
      ? normalizeLineItems(inv.line_items)
      : existing.line_items;
  const r = await sql`
    UPDATE invoices
    SET customer_id = ${inv.customer_id !== undefined ? inv.customer_id : existing.customer_id},
        customer_name = ${inv.customer_name ?? existing.customer_name},
        quote_id = ${inv.quote_id !== undefined ? inv.quote_id : existing.quote_id},
        title = ${inv.title ?? existing.title},
        status = ${inv.status ?? existing.status},
        line_items = ${JSON.stringify(items)}::jsonb,
        tax_pct = ${inv.tax_pct ?? existing.tax_pct},
        discount = ${inv.discount ?? existing.discount},
        notes = ${inv.notes ?? existing.notes},
        due_at = ${inv.due_at !== undefined ? inv.due_at : existing.due_at},
        paid_at = ${inv.paid_at !== undefined ? inv.paid_at : existing.paid_at},
        sent_at = ${inv.sent_at !== undefined ? inv.sent_at : existing.sent_at},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  const row = r.rows[0];
  return row ? toInvoice(row) : null;
}

export async function deleteInvoice(
  userId: number,
  id: number
): Promise<boolean> {
  const r = await sql`DELETE FROM invoices WHERE id = ${id} AND user_id = ${userId}`;
  return (r.rowCount ?? 0) > 0;
}

/** Mark unpaid/sent invoices past due as overdue. Returns count changed. */
export async function sweepOverdueInvoices(userId: number): Promise<number> {
  const r = await sql`
    UPDATE invoices
    SET status = 'overdue', updated_at = NOW()
    WHERE user_id = ${userId}
      AND status IN ('unpaid', 'sent')
      AND due_at IS NOT NULL
      AND due_at < CURRENT_DATE
  `;
  return r.rowCount ?? 0;
}

/** Invoices needing a payment reminder: overdue or past-due unpaid/sent. */
export async function listInvoicesNeedingReminder(
  userId: number
): Promise<Invoice[]> {
  await sweepOverdueInvoices(userId);
  const r = await sql`
    SELECT * FROM invoices
    WHERE user_id = ${userId}
      AND status IN ('overdue', 'unpaid', 'sent')
      AND due_at IS NOT NULL
      AND due_at < CURRENT_DATE
    ORDER BY due_at ASC
  `;
  return r.rows.map(toInvoice);
}

// -------------------------------------------------------------------- jobs

export type JobStatus = "scheduled" | "in_progress" | "complete" | "cancelled";

export interface Job {
  id: number;
  customer_id: number | null;
  customer_name: string;
  quote_id: number | null;
  title: string;
  scheduled_at: string | null;
  status: JobStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

function toJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as number,
    customer_id: (row.customer_id as number | null) ?? null,
    customer_name: (row.customer_name as string) || "",
    quote_id: (row.quote_id as number | null) ?? null,
    title: (row.title as string) || "",
    scheduled_at: (row.scheduled_at as string | null) ?? null,
    status: row.status as JobStatus,
    notes: (row.notes as string) || "",
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listJobs(
  userId: number,
  opts?: { from?: string; to?: string; status?: JobStatus }
): Promise<Job[]> {
  if (opts?.status) {
    const r = await sql`
      SELECT * FROM jobs
      WHERE user_id = ${userId} AND status = ${opts.status}
      ORDER BY scheduled_at ASC NULLS LAST
    `;
    return r.rows.map(toJob);
  }
  if (opts?.from && opts?.to) {
    const r = await sql`
      SELECT * FROM jobs
      WHERE user_id = ${userId}
        AND scheduled_at IS NOT NULL
        AND scheduled_at >= ${opts.from}::timestamptz
        AND scheduled_at < ${opts.to}::timestamptz
      ORDER BY scheduled_at ASC
    `;
    return r.rows.map(toJob);
  }
  const r = await sql`
    SELECT * FROM jobs WHERE user_id = ${userId} ORDER BY scheduled_at ASC NULLS LAST
  `;
  return r.rows.map(toJob);
}

export async function getJob(userId: number, id: number): Promise<Job | null> {
  const r = await sql`
    SELECT * FROM jobs WHERE id = ${id} AND user_id = ${userId} LIMIT 1
  `;
  const row = r.rows[0];
  return row ? toJob(row) : null;
}

export interface JobInput {
  customer_id?: number | null;
  customer_name: string;
  quote_id?: number | null;
  title: string;
  scheduled_at?: string | null;
  status?: JobStatus;
  notes?: string;
}

export async function createJob(userId: number, j: JobInput): Promise<Job> {
  const r = await sql`
    INSERT INTO jobs (user_id, customer_id, customer_name, quote_id, title, scheduled_at, status, notes)
    VALUES (${userId}, ${j.customer_id ?? null}, ${j.customer_name},
      ${j.quote_id ?? null}, ${j.title}, ${j.scheduled_at || null},
      ${j.status || "scheduled"}, ${j.notes || ""})
    RETURNING *
  `;
  return toJob(r.rows[0]);
}

export async function updateJob(
  userId: number,
  id: number,
  j: Partial<JobInput>
): Promise<Job | null> {
  const existing = await getJob(userId, id);
  if (!existing) return null;
  const r = await sql`
    UPDATE jobs
    SET customer_id = ${j.customer_id !== undefined ? j.customer_id : existing.customer_id},
        customer_name = ${j.customer_name ?? existing.customer_name},
        quote_id = ${j.quote_id !== undefined ? j.quote_id : existing.quote_id},
        title = ${j.title ?? existing.title},
        scheduled_at = ${j.scheduled_at !== undefined ? j.scheduled_at : existing.scheduled_at},
        status = ${j.status ?? existing.status},
        notes = ${j.notes ?? existing.notes},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  const row = r.rows[0];
  return row ? toJob(row) : null;
}

export async function deleteJob(userId: number, id: number): Promise<boolean> {
  const r = await sql`DELETE FROM jobs WHERE id = ${id} AND user_id = ${userId}`;
  return (r.rowCount ?? 0) > 0;
}

/** Jobs scheduled on a given date (YYYY-MM-DD), active statuses only. */
export async function listJobsForDate(
  userId: number,
  date: string
): Promise<Job[]> {
  const r = await sql`
    SELECT * FROM jobs
    WHERE user_id = ${userId}
      AND status IN ('scheduled', 'in_progress')
      AND scheduled_at IS NOT NULL
      AND (scheduled_at AT TIME ZONE 'UTC')::date = ${date}::date
    ORDER BY scheduled_at ASC
  `;
  return r.rows.map(toJob);
}

// ----------------------------------------------------------------- reviews

export type ReviewStatus = "requested" | "received";

export interface Review {
  id: number;
  customer_id: number | null;
  customer_name: string;
  job_id: number | null;
  job_title?: string;
  status: ReviewStatus;
  request_text: string;
  rating: number | null;
  review_text: string;
  requested_at: string;
  received_at: string | null;
}

function toReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as number,
    customer_id: (row.customer_id as number | null) ?? null,
    customer_name: (row.customer_name as string) || "",
    job_id: (row.job_id as number | null) ?? null,
    job_title: (row.job_title as string | undefined) ?? undefined,
    status: row.status as ReviewStatus,
    request_text: (row.request_text as string) || "",
    rating: (row.rating as number | null) ?? null,
    review_text: (row.review_text as string) || "",
    requested_at: row.requested_at as string,
    received_at: (row.received_at as string | null) ?? null,
  };
}

export async function listReviews(userId: number): Promise<Review[]> {
  const r = await sql`
    SELECT r.*, j.title AS job_title
    FROM reviews r
    LEFT JOIN jobs j ON j.id = r.job_id
    WHERE r.user_id = ${userId}
    ORDER BY r.requested_at DESC
  `;
  return r.rows.map(toReview);
}

export interface ReviewInput {
  customer_id?: number | null;
  customer_name: string;
  job_id?: number | null;
  request_text?: string;
}

export async function createReview(
  userId: number,
  input: ReviewInput
): Promise<Review> {
  const r = await sql`
    INSERT INTO reviews (user_id, customer_id, customer_name, job_id, request_text, requested_at)
    VALUES (${userId}, ${input.customer_id ?? null}, ${input.customer_name},
      ${input.job_id ?? null}, ${input.request_text || ""}, NOW())
    RETURNING *
  `;
  return toReview(r.rows[0]);
}

export async function markReviewReceived(
  userId: number,
  id: number,
  rating: number,
  reviewText: string
): Promise<Review | null> {
  const r = await sql`
    UPDATE reviews
    SET status = 'received', rating = ${rating}, review_text = ${reviewText},
        received_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  const row = r.rows[0];
  return row ? toReview(row) : null;
}

export async function deleteReview(
  userId: number,
  id: number
): Promise<boolean> {
  const r = await sql`DELETE FROM reviews WHERE id = ${id} AND user_id = ${userId}`;
  return (r.rowCount ?? 0) > 0;
}

// ------------------------------------------------------------- briefing

export interface Briefing {
  staleQuotes: Quote[];
  overdueInvoices: Invoice[];
  todaysJobs: Job[];
  upcomingJobsCount: number;
  reviewsDue: { id: number; title: string; customer_name: string }[];
}

/**
 * The daily briefing: everything that needs attention this morning.
 * Computed on dashboard load. Also sweeps past-due invoices to overdue.
 */
export async function getBriefing(userId: number): Promise<Briefing> {
  const today = new Date().toISOString().slice(0, 10);
  const [staleQuotes, overdueInvoices, todaysJobs] = await Promise.all([
    listStaleQuotes(userId, 2),
    listInvoicesNeedingReminder(userId),
    listJobsForDate(userId, today),
  ]);

  const upcoming = await sql`
    SELECT COUNT(*)::int AS c FROM jobs
    WHERE user_id = ${userId}
      AND status IN ('scheduled', 'in_progress')
      AND scheduled_at IS NOT NULL
      AND (scheduled_at AT TIME ZONE 'UTC')::date > ${today}::date
      AND (scheduled_at AT TIME ZONE 'UTC')::date <= (${today}::date + 7)
  `;

  // Completed jobs in the last 30 days with no review received yet.
  const due = await sql`
    SELECT j.id, j.title, j.customer_name
    FROM jobs j
    WHERE j.user_id = ${userId}
      AND j.status = 'complete'
      AND j.updated_at > NOW() - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM reviews r
        WHERE r.user_id = ${userId}
          AND r.job_id = j.id
          AND r.status = 'received'
      )
    ORDER BY j.updated_at DESC
    LIMIT 10
  `;

  return {
    staleQuotes,
    overdueInvoices,
    todaysJobs,
    upcomingJobsCount: (upcoming.rows[0] as { c: number }).c,
    reviewsDue: due.rows as Briefing["reviewsDue"],
  };
}

// ------------------------------------------------------- customer history

export interface CustomerHistory {
  quotes: Quote[];
  invoices: Invoice[];
  jobs: Job[];
  equipment: Equipment[];
  reviews: Review[];
}

export async function getCustomerHistory(
  userId: number,
  customerId: number
): Promise<CustomerHistory | null> {
  const customer = await getCustomer(userId, customerId);
  if (!customer) return null;
  const [quotes, invoices, jobs, equipment] = await Promise.all([
    (async () => {
      const r = await sql`
        SELECT * FROM quotes WHERE user_id = ${userId} AND customer_id = ${customerId}
        ORDER BY updated_at DESC LIMIT 25`;
      return r.rows.map(toQuote);
    })(),
    (async () => {
      const r = await sql`
        SELECT * FROM invoices WHERE user_id = ${userId} AND customer_id = ${customerId}
        ORDER BY updated_at DESC LIMIT 25`;
      return r.rows.map(toInvoice);
    })(),
    (async () => {
      const r = await sql`
        SELECT * FROM jobs WHERE user_id = ${userId} AND customer_id = ${customerId}
        ORDER BY scheduled_at DESC NULLS LAST LIMIT 25`;
      return r.rows.map(toJob);
    })(),
    listEquipment(userId, customerId),
  ]);
  const jobIds = jobs.map((j) => j.id);
  // jobIds are numbers read back from our own DB; safe to join into a param.
  const reviews =
    jobIds.length > 0
      ? (
          await sql`
            SELECT * FROM reviews
            WHERE user_id = ${userId}
              AND job_id = ANY(string_to_array(${jobIds.join(",")}, ',')::int[])
            ORDER BY requested_at DESC`
        ).rows.map(toReview)
      : [];
  return { quotes, invoices, jobs, equipment, reviews };
}
