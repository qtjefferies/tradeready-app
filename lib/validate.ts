import { NextResponse } from "next/server";
import { normalizeLineItems, type LineItem } from "./money";

/**
 * Request-body validation for the resource routes. Every helper returns
 * either { value } or { error } — routes turn errors into 400 JSON.
 */

const MAX_STR = 5000;

function str(v: unknown, max = MAX_STR): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  return t;
}

function optStr(v: unknown, max = MAX_STR): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function optNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function optIntId(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function optDate(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v.trim());
  if (Number.isNaN(d.getTime())) return null;
  return v.trim().slice(0, 30);
}

function optDateTime(v: unknown): string | null {
  return optDate(v);
}

const QUOTE_STATUSES = ["draft", "sent", "viewed", "accepted", "declined"] as const;
const INVOICE_STATUSES = ["draft", "unpaid", "sent", "overdue", "paid"] as const;
const JOB_STATUSES = ["scheduled", "in_progress", "complete", "cancelled"] as const;

export interface ParsedLineItems {
  line_items: LineItem[];
}

function lineItems(v: unknown): LineItem[] {
  return normalizeLineItems(v);
}

// ---------------------------------------------------------------- customers

export interface ParsedCustomer {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
}

export function parseCustomer(
  body: unknown
): { value: ParsedCustomer } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = str(b.name, 200);
  if (!name) return { error: "Customer name is required." };
  return {
    value: {
      name,
      phone: optStr(b.phone, 40),
      email: optStr(b.email, 254),
      address: optStr(b.address, 500),
      notes: optStr(b.notes),
    },
  };
}

// ------------------------------------------------------------------ quotes

export interface ParsedQuote {
  customer_id: number | null;
  customer_name: string;
  title: string;
  trade: string;
  status: (typeof QUOTE_STATUSES)[number];
  line_items: LineItem[];
  tax_pct: number;
  discount: number;
  notes: string;
  valid_until: string | null;
  sent_at: string | null;
}

export function parseQuote(
  body: unknown,
  forUpdate = false
): { value: Partial<ParsedQuote> & { title?: string; customer_name?: string } } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: Partial<ParsedQuote> = {};

  if (b.customer_id !== undefined) out.customer_id = optIntId(b.customer_id);
  if (b.customer_name !== undefined) out.customer_name = optStr(b.customer_name, 200);
  if (b.title !== undefined) {
    const t = str(b.title, 200);
    if (!t) return { error: "Quote title is required." };
    out.title = t;
  } else if (!forUpdate) {
    return { error: "Quote title is required." };
  }
  if (b.trade !== undefined) out.trade = optStr(b.trade, 80);
  if (b.status !== undefined) {
    if (!QUOTE_STATUSES.includes(b.status as (typeof QUOTE_STATUSES)[number])) {
      return { error: "Invalid quote status." };
    }
    out.status = b.status as ParsedQuote["status"];
  }
  if (b.line_items !== undefined) out.line_items = lineItems(b.line_items);
  if (b.tax_pct !== undefined) out.tax_pct = Math.max(0, Math.min(100, optNum(b.tax_pct)));
  if (b.discount !== undefined) out.discount = Math.max(0, optNum(b.discount));
  if (b.notes !== undefined) out.notes = optStr(b.notes);
  if (b.valid_until !== undefined) out.valid_until = optDate(b.valid_until);
  if (b.sent_at !== undefined) out.sent_at = optDateTime(b.sent_at);

  if (!forUpdate && !out.customer_name && out.customer_id == null) {
    return { error: "Attach a customer or enter a customer name." };
  }
  return { value: out };
}

// ----------------------------------------------------------------- invoices

export interface ParsedInvoice {
  customer_id: number | null;
  customer_name: string;
  quote_id: number | null;
  title: string;
  status: (typeof INVOICE_STATUSES)[number];
  line_items: LineItem[];
  tax_pct: number;
  discount: number;
  notes: string;
  due_at: string | null;
  paid_at: string | null;
  sent_at: string | null;
}

export function parseInvoice(
  body: unknown,
  forUpdate = false
): { value: Partial<ParsedInvoice> } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: Partial<ParsedInvoice> = {};

  if (b.customer_id !== undefined) out.customer_id = optIntId(b.customer_id);
  if (b.quote_id !== undefined) out.quote_id = optIntId(b.quote_id);
  if (b.customer_name !== undefined) out.customer_name = optStr(b.customer_name, 200);
  if (b.title !== undefined) {
    const t = str(b.title, 200);
    if (!t) return { error: "Invoice title is required." };
    out.title = t;
  } else if (!forUpdate) {
    return { error: "Invoice title is required." };
  }
  if (b.status !== undefined) {
    if (!INVOICE_STATUSES.includes(b.status as (typeof INVOICE_STATUSES)[number])) {
      return { error: "Invalid invoice status." };
    }
    out.status = b.status as ParsedInvoice["status"];
  }
  if (b.line_items !== undefined) out.line_items = lineItems(b.line_items);
  if (b.tax_pct !== undefined) out.tax_pct = Math.max(0, Math.min(100, optNum(b.tax_pct)));
  if (b.discount !== undefined) out.discount = Math.max(0, optNum(b.discount));
  if (b.notes !== undefined) out.notes = optStr(b.notes);
  if (b.due_at !== undefined) out.due_at = optDate(b.due_at);
  if (b.paid_at !== undefined) out.paid_at = optDate(b.paid_at);
  if (b.sent_at !== undefined) out.sent_at = optDateTime(b.sent_at);

  if (!forUpdate && !out.customer_name && out.customer_id == null) {
    return { error: "Attach a customer or enter a customer name." };
  }
  return { value: out };
}

// --------------------------------------------------------------------- jobs

export interface ParsedJob {
  customer_id: number | null;
  customer_name: string;
  quote_id: number | null;
  title: string;
  scheduled_at: string | null;
  status: (typeof JOB_STATUSES)[number];
  notes: string;
}

export function parseJob(
  body: unknown,
  forUpdate = false
): { value: Partial<ParsedJob> } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const out: Partial<ParsedJob> = {};

  if (b.customer_id !== undefined) out.customer_id = optIntId(b.customer_id);
  if (b.quote_id !== undefined) out.quote_id = optIntId(b.quote_id);
  if (b.customer_name !== undefined) out.customer_name = optStr(b.customer_name, 200);
  if (b.title !== undefined) {
    const t = str(b.title, 200);
    if (!t) return { error: "Job title is required." };
    out.title = t;
  } else if (!forUpdate) {
    return { error: "Job title is required." };
  }
  if (b.scheduled_at !== undefined) out.scheduled_at = optDateTime(b.scheduled_at);
  if (b.status !== undefined) {
    if (!JOB_STATUSES.includes(b.status as (typeof JOB_STATUSES)[number])) {
      return { error: "Invalid job status." };
    }
    out.status = b.status as ParsedJob["status"];
  }
  if (b.notes !== undefined) out.notes = optStr(b.notes);
  return { value: out };
}

// ------------------------------------------------------------------ reviews

export function parseReviewCreate(
  body: unknown
): { value: { customer_id: number | null; customer_name: string; job_id: number | null; request_text: string } } | { error: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  const customer_name = optStr(b.customer_name, 200);
  const customer_id = optIntId(b.customer_id);
  if (!customer_name && customer_id == null) {
    return { error: "Pick a customer for this review request." };
  }
  return {
    value: {
      customer_id,
      customer_name,
      job_id: optIntId(b.job_id),
      request_text: optStr(b.request_text),
    },
  };
}

export function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 });
}

export async function readJson(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}
