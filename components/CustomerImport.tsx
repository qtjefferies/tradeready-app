"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { detectColumns, parseCsv, rowsToCustomers, type ImportedCustomer } from "@/lib/csv";
import { IconCheck, IconPlus, IconX } from "./icons";

/**
 * CustomerImport — bring the whole customer list in from a file instead of
 * typing it in one at a time.
 *
 * Contractors already have their people somewhere: phone contacts, a
 * spreadsheet, the last app they tried. Re-typing two hundred names is the
 * reason a trial dies on day one.
 *
 * The file is parsed IN THE BROWSER and only the four fields this app uses
 * are sent. A contacts export carries birthdays, relationships, notes and
 * photos, and none of that is ours to receive.
 */
export default function CustomerImport() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ImportedCustomer[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);

  function reset() {
    setPreview(null);
    setSkipped(0);
    setFileName("");
    setError("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function handleFile(file: File) {
    setError("");
    setPreview(null);

    if (file.size > 2 * 1024 * 1024) {
      setError("That file is over 2 MB. Export just the contacts, not photos.");
      return;
    }

    try {
      const text = await file.text();
      const table = parseCsv(text);
      if (table.headers.length === 0) {
        setError("That file looks empty.");
        return;
      }
      const mapping = detectColumns(table.headers);
      if (mapping.name < 0 && mapping.first < 0 && mapping.last < 0) {
        setError(
          `Couldn't find a name column. The file's columns are: ${table.headers
            .slice(0, 8)
            .join(", ")}. Rename one to "Name" and try again.`
        );
        return;
      }
      const { customers, skipped: skippedRows } = rowsToCustomers(table, mapping);
      if (customers.length === 0) {
        setError("No rows in that file had a name we could read.");
        return;
      }
      setPreview(customers);
      setSkipped(skippedRows);
      setFileName(file.name);
    } catch {
      setError("Couldn't read that file. A .csv export works best.");
    }
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    setError("");
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customers: preview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't import those customers.");
        return;
      }
      const { created, duplicates } = data as { created: number; duplicates: number };
      toast(
        duplicates > 0
          ? `${created} customer${created === 1 ? "" : "s"} added. ${duplicates} already on your list.`
          : `${created} customer${created === 1 ? "" : "s"} added.`
      );
      reset();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary w-full !min-h-[48px] text-sm"
      >
        <IconPlus className="h-4 w-4" /> Import from a file
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-ink-600 bg-ink-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base uppercase tracking-wide text-paper">
            Import customers
          </p>
          <p className="mt-1 text-sm leading-relaxed text-bone-400">
            Export your contacts or a spreadsheet as CSV and drop it here. We
            read name, phone, email and address — nothing else leaves your
            computer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          aria-label="Close import"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-bone-500 transition hover:text-paper"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg border-2 border-alert-400/40 bg-alert-400/10 px-3 py-2 text-sm font-semibold leading-relaxed text-alert-300"
        >
          {error}
        </p>
      )}

      {!preview ? (
        <div className="mt-4">
          <label htmlFor="cust-import-file" className="label-dark">
            CSV file
          </label>
          <input
            id="cust-import-file"
            ref={fileInput}
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            className="w-full rounded-xl border-2 border-dashed border-ink-600 bg-ink-950 p-3 text-sm text-bone-300 file:mr-3 file:rounded-lg file:border-0 file:bg-safety-500 file:px-4 file:py-2 file:font-bold file:text-ink-950 hover:border-safety-500/50"
          />
        </div>
      ) : (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-money-300">
            <IconCheck className="h-5 w-5" />
            {preview.length} customer{preview.length === 1 ? "" : "s"} found in{" "}
            {fileName}
          </p>
          {skipped > 0 && (
            <p className="mt-1 text-sm text-bone-500">
              {skipped} row{skipped === 1 ? "" : "s"} had no name and will be
              skipped.
            </p>
          )}

          {/* Show the first few so they can see the columns landed in the
              right places before committing to the whole file. */}
          <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-ink-700 bg-ink-950 p-2">
            {preview.slice(0, 25).map((c, i) => (
              <li key={i} className="px-2 py-1 text-sm">
                <span className="font-semibold text-bone-200">{c.name}</span>
                {(c.phone || c.email) && (
                  <span className="text-bone-500">
                    {" "}
                    · {[c.phone, c.email].filter(Boolean).join(" · ")}
                  </span>
                )}
              </li>
            ))}
            {preview.length > 25 && (
              <li className="px-2 py-1 text-sm text-bone-500">
                …and {preview.length - 25} more
              </li>
            )}
          </ul>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={runImport}
              disabled={importing}
              className="btn-primary flex-1 text-base"
            >
              {importing ? "Importing…" : `Import ${preview.length}`}
            </button>
            <button type="button" onClick={reset} className="btn-secondary">
              Pick another file
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-bone-600">
            Anyone already on your list is skipped, so re-importing is safe.
          </p>
        </div>
      )}
    </div>
  );
}
