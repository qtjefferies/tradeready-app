"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Customer, Job, JobStatus } from "@/lib/store";
import { StatusBadge } from "./Badges";

const STATUSES: { value: JobStatus; label: string }[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];

/** ScheduleClient — job calendar list + schedule form + status changes. */
export default function ScheduleClient({
  jobs,
  customers,
}: {
  jobs: Job[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const grouped = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const j of jobs) {
      const key = j.scheduled_at
        ? new Date(j.scheduled_at).toISOString().slice(0, 10)
        : "unscheduled";
      const arr = map.get(key) ?? [];
      arr.push(j);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [jobs]);

  async function create() {
    if (!title.trim()) {
      setError("Give the job a title.");
      return;
    }
    const cust = customerId
      ? customers.find((c) => String(c.id) === customerId)
      : null;
    const name = cust ? cust.name : customerName.trim();
    if (!name) {
      setError("Pick a customer or type a customer name.");
      return;
    }
    setSaving(true);
    setError("");
    const scheduled_at =
      date && time
        ? new Date(`${date}T${time}`).toISOString()
        : date
          ? new Date(`${date}T09:00`).toISOString()
          : null;
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          customer_id: cust ? cust.id : null,
          customer_name: name,
          scheduled_at,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't schedule the job.");
        return;
      }
      setTitle("");
      setCustomerId("");
      setCustomerName("");
      setDate("");
      setTime("");
      setNotes("");
      setShowForm(false);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(job: Job, status: JobStatus) {
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't update the job.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  async function remove(job: Job) {
    if (!confirm(`Remove "${job.title}" from the schedule?`)) return;
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Couldn't delete the job.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }

  function dayLabel(key: string): string {
    if (key === "unscheduled") return "Unscheduled";
    const d = new Date(key + "T12:00:00");
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    if (key === today) return "Today";
    if (key === tomorrow) return "Tomorrow";
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary !py-2.5 text-sm"
        >
          {showForm ? "Cancel" : "+ Schedule a job"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {showForm && (
        <div className="card mb-8 p-6">
          <h3 className="mb-4 font-display text-base font-bold text-white">New job</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="j-title" className="label-dark">Job title</label>
              <input
                id="j-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Water heater install — Miller residence"
                className="input-dark"
              />
            </div>
            <div>
              <label htmlFor="j-customer" className="label-dark">Customer</label>
              <select
                id="j-customer"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  if (e.target.value) setCustomerName("");
                }}
                className="input-dark"
              >
                <option value="">Type a name instead…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="j-customer-name" className="label-dark">Customer name</label>
              <input
                id="j-customer-name"
                value={customerId ? customers.find((c) => String(c.id) === customerId)?.name ?? "" : customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={Boolean(customerId)}
                placeholder="e.g. Jane Miller"
                className="input-dark disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="j-date" className="label-dark">Date</label>
              <input
                id="j-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-dark"
              />
            </div>
            <div>
              <label htmlFor="j-time" className="label-dark">Time (optional)</label>
              <input
                id="j-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="input-dark"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="j-notes" className="label-dark">Notes</label>
              <textarea
                id="j-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Parts to bring, parking, gate code…"
                className="input-dark"
              />
            </div>
          </div>
          <button onClick={create} disabled={saving} className="btn-primary mt-4 text-sm">
            {saving ? "Scheduling…" : "Schedule job"}
          </button>
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-lg font-bold text-white">Nothing on the schedule.</p>
          <p className="mt-2 text-sm text-slate-400">
            Schedule your jobs here and they&apos;ll show up in your morning briefing.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, dayJobs]) => (
            <section key={day}>
              <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-slate-400">
                {dayLabel(day)}
              </h3>
              <ul className="space-y-2">
                {dayJobs.map((j) => (
                  <li
                    key={j.id}
                    className="card flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={j.status} />
                        <p className="truncate text-sm font-semibold text-white">{j.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {j.customer_name}
                        {j.scheduled_at &&
                          ` · ${new Date(j.scheduled_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                        {j.customer_id && (
                          <>
                            {" · "}
                            <Link
                              href={`/dashboard/customers/${j.customer_id}`}
                              className="text-amber-300 hover:text-amber-200"
                            >
                              customer record
                            </Link>
                          </>
                        )}
                      </p>
                      {j.notes && <p className="mt-1 text-xs text-slate-400">{j.notes}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={j.status}
                        onChange={(e) => setStatus(j, e.target.value as JobStatus)}
                        className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-amber-400/60"
                        aria-label={`Status for ${j.title}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => remove(j)}
                        className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
