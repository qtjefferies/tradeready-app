import { randomBytes } from "crypto";
import { sql } from "./db";
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

function toEquipment(row: Record<string, unknown>): Equipment {
  return {
    id: row.id as number,
    customer_id: row.customer_id as number,
    description: (row.description as string) || "",
    installed_at: toDateOnly(row.installed_at),
    notes: (row.notes as string) || "",
    created_at: toIso(row.created_at) ?? "",
  };
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
  return r.rows.map(toEquipment);
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
  return r.rows[0] ? toEquipment(r.rows[0]) : null;
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
  /** Set once the contractor generates a share link; null means unshared. */
  public_token: string | null;
  /** First time the customer opened the share link. */
  viewed_at: string | null;
  /** When the customer accepted or declined from the public page. */
  responded_at: string | null;
  decline_reason: string;
  followup_sent_at: string | null;
  followup_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Postgres hands back `Date` objects for TIMESTAMPTZ and DATE columns, but
 * every interface in this file declares those fields as ISO strings, and the
 * briefing compares them against strings. A cast alone let a `Date` through
 * wearing a string's type, so `sent_at < twoDaysAgo` was comparing a Date to a
 * string — always false, which silently emptied the follow-up and overdue
 * sections. Convert for real at the boundary instead.
 */
function toIso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

/**
 * DATE columns carry a calendar day with no time. Read the local date parts
 * rather than going through UTC, so an offset can't shift a due date onto the
 * neighbouring day.
 */
function toDateOnly(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (!(v instanceof Date)) return String(v).slice(0, 10);
  const mm = String(v.getMonth() + 1).padStart(2, "0");
  const dd = String(v.getDate()).padStart(2, "0");
  return `${v.getFullYear()}-${mm}-${dd}`;
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
    valid_until: toDateOnly(row.valid_until),
    sent_at: toIso(row.sent_at),
    public_token: (row.public_token as string | null) ?? null,
    viewed_at: toIso(row.viewed_at),
    responded_at: toIso(row.responded_at),
    decline_reason: (row.decline_reason as string) || "",
    followup_sent_at: toIso(row.followup_sent_at),
    followup_count: Number(row.followup_count ?? 0),
    created_at: toIso(row.created_at) ?? "",
    updated_at: toIso(row.updated_at) ?? "",
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
    due_at: toDateOnly(row.due_at),
    paid_at: toDateOnly(row.paid_at),
    sent_at: toIso(row.sent_at),
    created_at: toIso(row.created_at) ?? "",
    updated_at: toIso(row.updated_at) ?? "",
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
    scheduled_at: toIso(row.scheduled_at),
    status: row.status as JobStatus,
    notes: (row.notes as string) || "",
    created_at: toIso(row.created_at) ?? "",
    updated_at: toIso(row.updated_at) ?? "",
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
    requested_at: toIso(row.requested_at) ?? "",
    received_at: toIso(row.received_at),
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

// ------------------------------------------------- public quote links

/**
 * Share links.
 *
 * A quote's `public_token` is a 256-bit random value — the capability to read
 * that one quote and answer it, and nothing else. The functions below are the
 * only ones in this file that are NOT scoped to a user_id, because the caller
 * is the customer and has no account. They are scoped to a single token
 * instead, which is equivalent: a token identifies exactly one row, and
 * guessing one is not feasible.
 */

/** Base64url, so the token is safe to drop straight into a URL path. */
function newShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Return the quote's share token, minting one on first use. Idempotent: the
 * same quote keeps the same link forever, so a link already texted to a
 * customer never goes dead.
 */
export async function ensureShareToken(
  userId: number,
  quoteId: number
): Promise<string | null> {
  const existing = await getQuote(userId, quoteId);
  if (!existing) return null;
  if (existing.public_token) return existing.public_token;

  const r = await sql`
    UPDATE quotes SET public_token = ${newShareToken()}
    WHERE id = ${quoteId} AND user_id = ${userId} AND public_token IS NULL
    RETURNING public_token
  `;
  const row = r.rows[0] as { public_token: string } | undefined;
  // Lost a race with a concurrent mint — re-read rather than overwrite, so the
  // token that won is the one we hand back.
  if (!row) return (await getQuote(userId, quoteId))?.public_token ?? null;
  return row.public_token;
}

/** Revoke a share link. The quote keeps its history; the URL stops working. */
export async function revokeShareToken(
  userId: number,
  quoteId: number
): Promise<boolean> {
  const r = await sql`
    UPDATE quotes SET public_token = NULL
    WHERE id = ${quoteId} AND user_id = ${userId}
  `;
  return (r.rowCount ?? 0) > 0;
}

export interface PublicQuote {
  quote: Quote;
  /**
   * The profile's public contact details. `email` here is `contact_email`,
   * never `users.email` — the login identifier is left out at the source
   * rather than merely left unrendered, because this payload crosses to an
   * unauthenticated page.
   */
  business: {
    businessName: string;
    trade: string;
    phone: string;
    email: string;
    website: string;
    licenseNumber: string;
  };
}

/**
 * Read a quote by its share token, with the contractor's public business
 * details. Draft quotes are treated as not found: a link generated before the
 * quote was finished must not expose a work-in-progress price.
 *
 * Returns only the fields the customer is meant to see — the caller renders
 * this, never the raw row.
 */
export async function getQuoteByToken(token: string): Promise<PublicQuote | null> {
  if (!token) return null;
  const r = await sql`
    SELECT * FROM quotes WHERE public_token = ${token} LIMIT 1
  `;
  const row = r.rows[0];
  if (!row) return null;
  const quote = toQuote(row);
  if (quote.status === "draft") return null;
  const info = await getPublicBusinessInfo(row.user_id as number);
  return {
    quote,
    business: {
      businessName: info.businessName,
      trade: info.trade,
      phone: info.phone,
      email: info.email,
      website: info.website,
      licenseNumber: info.licenseNumber,
    },
  };
}

/**
 * Record that the customer opened the link. Only the FIRST open counts, and
 * only from 'sent' — reopening an accepted quote must not drag its status
 * backwards. Best-effort: a failure here must never block rendering the quote.
 */
export async function markQuoteViewed(token: string): Promise<void> {
  try {
    await sql`
      UPDATE quotes
      SET viewed_at = NOW(),
          status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
          updated_at = NOW()
      WHERE public_token = ${token} AND viewed_at IS NULL
    `;
  } catch {
    // Tracking is a nice-to-have; showing the customer their quote is not.
  }
}

export type QuoteResponse = "accepted" | "declined";

/**
 * The customer's answer from the public page.
 *
 * Only a quote that is still open ('sent' or 'viewed') can be answered, and
 * `responded_at IS NULL` locks it to one answer — a re-submitted form or a
 * revisited link can't flip a decision the contractor has already acted on.
 * Returns null when the quote was already closed.
 */
export async function respondToQuote(
  token: string,
  response: QuoteResponse,
  declineReason: string
): Promise<Quote | null> {
  const r = await sql`
    UPDATE quotes
    SET status = ${response},
        responded_at = NOW(),
        decline_reason = ${response === "declined" ? declineReason.slice(0, 500) : ""},
        viewed_at = COALESCE(viewed_at, NOW()),
        updated_at = NOW()
    WHERE public_token = ${token}
      AND responded_at IS NULL
      AND status IN ('sent', 'viewed')
    RETURNING *
  `;
  const row = r.rows[0];
  return row ? toQuote(row) : null;
}

/**
 * Log that a follow-up was drafted for this quote. Counting nudges is what
 * lets the win-rate screen eventually answer "does following up actually win
 * work?" — it can only report that once the counts exist.
 */
export async function logFollowup(userId: number, quoteId: number): Promise<void> {
  try {
    await sql`
      UPDATE quotes
      SET followup_sent_at = NOW(), followup_count = followup_count + 1
      WHERE id = ${quoteId} AND user_id = ${userId}
    `;
  } catch {
    // Logging must never fail the follow-up the contractor actually asked for.
  }
}

// ------------------------------------------------------ equipment (all)

export interface EquipmentWithCustomer extends Equipment {
  customer_name: string;
}

/**
 * Every install on record, newest first, with the customer's name attached.
 * The per-customer `listEquipment` answers "what's in this house"; this one
 * feeds the money engine, which asks "what's old enough to call about".
 */
export async function listAllEquipment(
  userId: number
): Promise<EquipmentWithCustomer[]> {
  const r = await sql`
    SELECT e.id, e.customer_id, e.description, e.installed_at, e.notes,
           e.created_at, c.name AS customer_name
    FROM equipment e
    JOIN customers c ON c.id = e.customer_id AND c.user_id = e.user_id
    WHERE e.user_id = ${userId} AND e.installed_at IS NOT NULL
    ORDER BY e.installed_at ASC
  `;
  return r.rows.map((row) => ({
    ...toEquipment(row),
    customer_name: (row.customer_name as string) || "",
  }));
}

// ------------------------------------------------------------- settings

/**
 * The editable business profile.
 *
 * `email` is deliberately absent: that is the login identifier, changed
 * through its own guarded path, never as part of a profile save.
 */
export interface BusinessSettings {
  businessName: string;
  trade: string;
  phone: string;
  contactEmail: string;
  address: string;
  website: string;
  licenseNumber: string;
  defaultTaxPct: number;
  defaultPaymentTermsDays: number;
  defaultQuoteNotes: string;
}

function toSettings(row: Record<string, unknown>): BusinessSettings {
  return {
    businessName: (row.business_name as string) || "",
    trade: (row.trade as string) || "",
    phone: (row.phone as string) || "",
    contactEmail: (row.contact_email as string) || "",
    address: (row.address as string) || "",
    website: (row.website as string) || "",
    licenseNumber: (row.license_number as string) || "",
    defaultTaxPct: Number(row.default_tax_pct ?? 0),
    defaultPaymentTermsDays: Number(row.default_payment_terms_days ?? 14),
    defaultQuoteNotes: (row.default_quote_notes as string) || "",
  };
}

export async function getSettings(userId: number): Promise<BusinessSettings | null> {
  const r = await sql`
    SELECT business_name, trade, phone, contact_email, address, website,
           license_number, default_tax_pct, default_payment_terms_days,
           default_quote_notes
    FROM users WHERE id = ${userId} LIMIT 1
  `;
  return r.rows[0] ? toSettings(r.rows[0]) : null;
}

export async function updateSettings(
  userId: number,
  s: BusinessSettings
): Promise<BusinessSettings | null> {
  const r = await sql`
    UPDATE users SET
      business_name = ${s.businessName},
      trade = ${s.trade},
      phone = ${s.phone},
      contact_email = ${s.contactEmail},
      address = ${s.address},
      website = ${s.website},
      license_number = ${s.licenseNumber},
      default_tax_pct = ${s.defaultTaxPct},
      default_payment_terms_days = ${s.defaultPaymentTermsDays},
      default_quote_notes = ${s.defaultQuoteNotes}
    WHERE id = ${userId}
    RETURNING business_name, trade, phone, contact_email, address, website,
              license_number, default_tax_pct, default_payment_terms_days,
              default_quote_notes
  `;
  return r.rows[0] ? toSettings(r.rows[0]) : null;
}

/**
 * The business details that go on customer-facing paperwork — PDFs and the
 * public quote page.
 *
 * `contact_email` only. The login address is never published: it is half of
 * the account's credentials, and a contractor who typed a personal address
 * at signup did not agree to print it on every invoice.
 */
export async function getPublicBusinessInfo(userId: number): Promise<{
  businessName: string;
  trade: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  licenseNumber: string;
}> {
  const r = await sql`
    SELECT business_name, trade, phone, contact_email, address, website, license_number
    FROM users WHERE id = ${userId} LIMIT 1
  `;
  const row = r.rows[0] as Record<string, unknown> | undefined;
  return {
    businessName: (row?.business_name as string) || "",
    trade: (row?.trade as string) || "",
    phone: (row?.phone as string) || "",
    email: (row?.contact_email as string) || "",
    address: (row?.address as string) || "",
    website: (row?.website as string) || "",
    licenseNumber: (row?.license_number as string) || "",
  };
}

/** Change the login password. Returns false when the user is gone. */
export async function setPasswordHash(
  userId: number,
  passwordHash: string
): Promise<boolean> {
  const r = await sql`
    UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}
  `;
  return (r.rowCount ?? 0) > 0;
}

export async function getPasswordHashById(userId: number): Promise<string | null> {
  const r = await sql`SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1`;
  return (r.rows[0] as { password_hash: string } | undefined)?.password_hash ?? null;
}

/**
 * Delete the account and everything in it. Every table referencing users
 * cascades, so this removes customers, quotes, invoices, jobs, reviews,
 * equipment and sessions along with the row.
 */
export async function deleteAccount(userId: number): Promise<boolean> {
  const r = await sql`DELETE FROM users WHERE id = ${userId}`;
  return (r.rowCount ?? 0) > 0;
}

// ------------------------------------------------------- customer import

export interface ImportResult {
  created: number;
  duplicates: number;
}

/**
 * Bulk-create customers from an import.
 *
 * Skips anyone whose name already exists on the account, case-insensitively.
 * A contractor re-importing a contacts export after adding a few new people
 * is the normal case, and silently doubling their list would be worse than
 * importing nothing — they'd have to clean it up by hand.
 *
 * Runs as one statement per row inside a transaction rather than a single
 * giant INSERT: lists are small (hundreds at most) and this keeps the
 * per-row skip logic readable.
 */
export async function importCustomers(
  userId: number,
  rows: { name: string; phone: string; email: string; address: string }[]
): Promise<ImportResult> {
  if (rows.length === 0) return { created: 0, duplicates: 0 };

  const existing = await sql`
    SELECT LOWER(name) AS name FROM customers WHERE user_id = ${userId}
  `;
  const seen = new Set(existing.rows.map((r) => (r.name as string) || ""));

  let created = 0;
  let duplicates = 0;

  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    if (!key || seen.has(key)) {
      duplicates++;
      continue;
    }
    // Added to the set before the insert so duplicates *within the file*
    // are caught too, not just collisions with what was already saved.
    seen.add(key);
    await sql`
      INSERT INTO customers (user_id, name, phone, email, address)
      VALUES (${userId}, ${r.name.trim()}, ${r.phone}, ${r.email}, ${r.address})
    `;
    created++;
  }

  return { created, duplicates };
}
