"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import type { BusinessSettings } from "@/lib/store";
import { IconCheck, IconWrench } from "./icons";

/**
 * Settings — the business profile, the defaults, and the account.
 *
 * Everything here used to be write-once at signup, which meant a phone
 * number typed wrong on day one printed on every invoice forever.
 */

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6 sm:p-8">
      <h3 className="font-display text-xl uppercase tracking-wide text-paper">
        {title}
      </h3>
      {blurb && (
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-bone-400">
          {blurb}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-dark">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-sm leading-relaxed text-bone-500">{hint}</p>}
    </div>
  );
}

export default function SettingsClient({
  initial,
  loginEmail,
}: {
  initial: BusinessSettings;
  loginEmail: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [s, setS] = useState<BusinessSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const set = <K extends keyof BusinessSettings>(k: K, v: BusinessSettings[K]) => {
    setS((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  // --- password ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");

  // --- danger zone ---
  const [deleting, setDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  async function saveProfile() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't save your settings.");
        toast(data.error || "Couldn't save your settings.", "error");
        return;
      }
      setS(data.settings);
      setDirty(false);
      toast("Settings saved. New quotes and invoices will use these details.");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      toast("Couldn't reach the server.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    setPwError("");
    if (newPassword !== confirmPassword) {
      setPwError("The two new passwords don't match.");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Couldn't change your password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast(data.message || "Password changed.");
    } catch {
      setPwError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setPwSaving(false);
    }
  }

  async function closeAccount() {
    const ok = await confirm({
      title: "Close this account for good?",
      body: "Every customer, quote, invoice, job and review on this account is deleted immediately. This cannot be undone, and we cannot get it back for you. Download any PDFs you need first.",
      confirmLabel: "Close my account",
      destructive: true,
      requireTyped: "DELETE",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/settings/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirm: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Couldn't close the account.", "error");
        return;
      }
      // Full reload rather than a router push: the session cookie is gone and
      // every cached server component for this account is now stale.
      window.location.href = "/";
    } catch {
      toast("Couldn't reach the server.", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300"
        >
          {error}
        </p>
      )}

      <Section
        title="Business details"
        blurb="These print on every quote and invoice you send, and show on the quote pages your customers open."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="set-business" label="Business name">
            <input
              id="set-business"
              type="text"
              value={s.businessName}
              onChange={(e) => set("businessName", e.target.value)}
              className="input-dark"
              placeholder="e.g. Ironclad Plumbing & Heating"
            />
          </Field>
          <Field id="set-trade" label="Trade">
            <input
              id="set-trade"
              type="text"
              value={s.trade}
              onChange={(e) => set("trade", e.target.value)}
              className="input-dark"
              placeholder="e.g. Plumbing"
            />
          </Field>
          <Field id="set-phone" label="Phone" hint="What customers tap to call you.">
            <input
              id="set-phone"
              type="tel"
              value={s.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="input-dark"
              placeholder="(503) 555-0142"
            />
          </Field>
          <Field
            id="set-contact-email"
            label="Contact email"
            hint="Shown to customers. Separate from the email you log in with, which is never published."
          >
            <input
              id="set-contact-email"
              type="email"
              value={s.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              className="input-dark"
              placeholder="jobs@yourbusiness.com"
            />
          </Field>
          <Field id="set-address" label="Business address">
            <input
              id="set-address"
              type="text"
              value={s.address}
              onChange={(e) => set("address", e.target.value)}
              className="input-dark"
              placeholder="221 Mill Race Way, Portland OR"
            />
          </Field>
          <Field id="set-website" label="Website">
            <input
              id="set-website"
              type="text"
              value={s.website}
              onChange={(e) => set("website", e.target.value)}
              className="input-dark"
              placeholder="yourbusiness.com"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id="set-license"
              label="Contractor license number"
              hint="Several states require this on written estimates and invoices. Leave blank if yours doesn't."
            >
              <input
                id="set-license"
                type="text"
                value={s.licenseNumber}
                onChange={(e) => set("licenseNumber", e.target.value)}
                className="input-dark"
                placeholder="e.g. CCB #219884"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Defaults"
        blurb="Applied to new quotes and invoices so you stop retyping the same numbers. You can still change them on any individual document."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="set-tax" label="Default tax %">
            <input
              id="set-tax"
              type="number"
              min={0}
              max={100}
              step="any"
              value={s.defaultTaxPct}
              onChange={(e) =>
                set("defaultTaxPct", Math.max(0, Number(e.target.value) || 0))
              }
              className="input-dark"
            />
          </Field>
          <Field
            id="set-terms"
            label="Payment terms (days)"
            hint="How long after an invoice is raised it's due."
          >
            <input
              id="set-terms"
              type="number"
              min={0}
              max={365}
              value={s.defaultPaymentTermsDays}
              onChange={(e) =>
                set(
                  "defaultPaymentTermsDays",
                  Math.max(0, Math.round(Number(e.target.value) || 0))
                )
              }
              className="input-dark"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field
              id="set-notes"
              label="Standard quote notes"
              hint="Your boilerplate — warranty, what's included, deposit terms. Pre-filled on every new quote."
            >
              <textarea
                id="set-notes"
                rows={3}
                value={s.defaultQuoteNotes}
                onChange={(e) => set("defaultQuoteNotes", e.target.value)}
                className="input-dark"
                placeholder="e.g. Price includes haul-away of the old unit. 1-year labor warranty. 50% deposit due on scheduling."
              />
            </Field>
          </div>
        </div>
      </Section>

      <div className="sticky-actions">
        <button
          onClick={saveProfile}
          disabled={saving || !dirty}
          className="btn-primary w-full text-base sm:w-auto"
        >
          {saving ? "Saving…" : dirty ? "Save changes" : <><IconCheck className="h-5 w-5" /> Saved</>}
        </button>
      </div>

      <Section title="Sign-in" blurb="How you get into TradeReady.">
        <div className="well mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="stat-label">Login email</p>
            <p className="mt-1 text-[15px] font-semibold text-bone-200">{loginEmail}</p>
          </div>
          <p className="max-w-xs text-sm text-bone-500">
            Never shown to customers. To change it, get in touch — we verify the
            new address first.
          </p>
        </div>

        {pwError && (
          <p
            role="alert"
            className="mb-4 rounded-xl border-2 border-alert-400/40 bg-alert-400/10 px-4 py-3 text-[15px] font-semibold text-alert-300"
          >
            {pwError}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="pw-current" label="Current password">
            <input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-dark"
            />
          </Field>
          <Field id="pw-new" label="New password" hint="At least 8 characters.">
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-dark"
            />
          </Field>
          <Field id="pw-confirm" label="Repeat new password">
            <input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-dark"
            />
          </Field>
        </div>
        <button
          onClick={changePassword}
          disabled={pwSaving || !currentPassword || !newPassword}
          className="btn-secondary mt-5 w-full text-base sm:w-auto"
        >
          {pwSaving ? "Changing…" : "Change password"}
        </button>
      </Section>

      <section className="card border-alert-400/25 p-6 sm:p-8">
        <h3 className="font-display text-xl uppercase tracking-wide text-alert-300">
          Close account
        </h3>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-bone-400">
          Deletes everything — customers, quotes, invoices, jobs, reviews —
          immediately and permanently. Download any paperwork you need first.
        </p>
        <div className="mt-5 max-w-sm">
          <Field
            id="delete-password"
            label="Your password"
            hint="Required so a session left open on a shared phone can't close your business account."
          >
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="input-dark"
            />
          </Field>
        </div>
        <button
          onClick={closeAccount}
          disabled={deleting || !deletePassword}
          className="btn-danger mt-5"
        >
          {deleting ? "Closing…" : "Close my account"}
        </button>
      </section>

      <p className="flex items-center justify-center gap-2 pt-2 text-sm text-bone-600">
        <IconWrench className="h-4 w-4" />
        Changes apply to new documents. Quotes and invoices already sent keep
        the details they were sent with.
      </p>
    </div>
  );
}
