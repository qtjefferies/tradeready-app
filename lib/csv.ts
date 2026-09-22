/**
 * A small CSV reader for customer import.
 *
 * Deliberately not a dependency: contractors export from Google Contacts,
 * iPhone contacts, QuickBooks, Jobber or a spreadsheet, and what they hand
 * over is a plain table with quoted fields and the occasional comma inside a
 * street address. That is the whole job.
 *
 * Handles quoted fields, escaped quotes (""), CRLF, and a UTF-8 BOM — which
 * Excel adds and which silently breaks a naive header match on the first
 * column, the single most common import failure there is.
 */

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export function parseCsv(input: string): CsvTable {
  const text = input.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // Whatever is left when the text ends is the final field of the final row.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const cleaned = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (cleaned.length === 0) return { headers: [], rows: [] };

  return {
    headers: cleaned[0].map((h) => h.trim()),
    rows: cleaned.slice(1),
  };
}

export interface ImportedCustomer {
  name: string;
  phone: string;
  email: string;
  address: string;
}

/**
 * Column aliases, lower-cased and stripped of punctuation. Covers what the
 * common exporters actually emit — Google Contacts writes "Name" and
 * "Phone 1 - Value", iPhone writes "First Name"/"Last Name", QuickBooks
 * writes "Customer"/"Full Name", spreadsheets write whatever the owner typed.
 */
const ALIASES: Record<keyof ImportedCustomer | "first" | "last", string[]> = {
  name: ["name", "customer", "customername", "fullname", "displayname", "client", "contact"],
  first: ["firstname", "givenname", "first"],
  last: ["lastname", "familyname", "surname", "last"],
  phone: ["phone", "phonenumber", "mobile", "cell", "telephone", "tel", "phone1value", "primaryphone", "homephone", "workphone"],
  email: ["email", "emailaddress", "email1value", "primaryemail", "mail"],
  address: ["address", "streetaddress", "street", "address1", "addressline1", "fulladdress", "location", "serviceaddress"],
};

const normalise = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function findColumn(headers: string[], keys: string[]): number {
  const norm = headers.map(normalise);
  // Exact alias first, so "Email" wins over "Email Type" when both exist.
  for (const key of keys) {
    const exact = norm.indexOf(key);
    if (exact !== -1) return exact;
  }
  for (const key of keys) {
    const partial = norm.findIndex((h) => h.startsWith(key));
    if (partial !== -1) return partial;
  }
  return -1;
}

export interface CsvMapping {
  name: number;
  first: number;
  last: number;
  phone: number;
  email: number;
  address: number;
}

export function detectColumns(headers: string[]): CsvMapping {
  return {
    name: findColumn(headers, ALIASES.name),
    first: findColumn(headers, ALIASES.first),
    last: findColumn(headers, ALIASES.last),
    phone: findColumn(headers, ALIASES.phone),
    email: findColumn(headers, ALIASES.email),
    address: findColumn(headers, ALIASES.address),
  };
}

const cell = (row: string[], i: number) => (i >= 0 ? (row[i] ?? "").trim() : "");

/**
 * Turn a parsed table into customers, skipping rows with no usable name.
 * A name is built from first/last when there's no single name column, which
 * is what every phone-contacts export looks like.
 */
export function rowsToCustomers(
  table: CsvTable,
  mapping: CsvMapping
): { customers: ImportedCustomer[]; skipped: number } {
  const customers: ImportedCustomer[] = [];
  let skipped = 0;

  for (const row of table.rows) {
    let name = cell(row, mapping.name);
    if (!name) {
      name = [cell(row, mapping.first), cell(row, mapping.last)]
        .filter(Boolean)
        .join(" ");
    }
    if (!name) {
      skipped++;
      continue;
    }
    customers.push({
      name: name.slice(0, 200),
      phone: cell(row, mapping.phone).slice(0, 40),
      email: cell(row, mapping.email).slice(0, 254),
      address: cell(row, mapping.address).slice(0, 300),
    });
  }
  return { customers, skipped };
}
