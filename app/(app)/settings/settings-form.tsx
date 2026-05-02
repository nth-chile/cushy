"use client";

import { useState } from "react";

type Settings = {
  id: number;
  businessName: string | null;
  businessAddress: string | null;
  businessEmail: string | null;
  invoiceNumberStart: number;
  defaultEmailSubject: string | null;
  defaultEmailBody: string | null;
  gmailUser: string | null;
} | null;

export default function SettingsForm({ initial }: { initial: Settings }) {
  const [businessName, setBusinessName] = useState(initial?.businessName ?? "");
  const [businessAddress, setBusinessAddress] = useState(initial?.businessAddress ?? "");
  const [businessEmail, setBusinessEmail] = useState(initial?.businessEmail ?? "");
  const [invoiceNumberStart, setInvoiceNumberStart] = useState(String(initial?.invoiceNumberStart ?? 1000));
  const [defaultEmailSubject, setDefaultEmailSubject] = useState(initial?.defaultEmailSubject ?? "Invoice {{number}} from {{businessName}}");
  const [defaultEmailBody, setDefaultEmailBody] = useState(initial?.defaultEmailBody ?? "Hi {{contactName}},\n\nPlease find attached invoice {{number}}.\n\nThanks,\n{{businessName}}");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch(`/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName,
        businessAddress,
        businessEmail,
        invoiceNumberStart: Number(invoiceNumberStart),
        defaultEmailSubject,
        defaultEmailBody,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Business</h2>
        <Field label="Business name">
          <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Business address (shown on invoice)">
          <textarea value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} rows={3} className={inputCls} />
        </Field>
        <Field label="Business email">
          <input value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} type="email" className={inputCls} />
        </Field>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Invoicing</h2>
        <Field label="Starting invoice number (next invoice will be at least this)">
          <input value={invoiceNumberStart} onChange={(e) => setInvoiceNumberStart(e.target.value)} type="number" className={inputCls} />
        </Field>
        <Field label="Default email subject template">
          <input value={defaultEmailSubject} onChange={(e) => setDefaultEmailSubject(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Default email body template">
          <textarea value={defaultEmailBody} onChange={(e) => setDefaultEmailBody(e.target.value)} rows={6} className={inputCls} />
        </Field>
        <p className="text-xs text-zinc-500">
          Available variables: <code>{"{{number}}"}</code>, <code>{"{{businessName}}"}</code>,{" "}
          <code>{"{{contactName}}"}</code>, <code>{"{{clientName}}"}</code>
        </p>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <div>{children}</div>
    </label>
  );
}
