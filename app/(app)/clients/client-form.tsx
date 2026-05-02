"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Contact = { id?: number; name: string; email: string; isPrimary: boolean };
type ClientInitial = {
  id: number;
  name: string;
  company: string | null;
  address: string | null;
  notes: string | null;
  hourlyRate: string | null;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  contacts: Contact[];
};

export default function ClientForm({ initial }: { initial?: ClientInitial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [hourlyRate, setHourlyRate] = useState(initial?.hourlyRate ?? "");
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState(initial?.emailSubjectTemplate ?? "");
  const [emailBodyTemplate, setEmailBodyTemplate] = useState(initial?.emailBodyTemplate ?? "");
  const [contactList, setContactList] = useState<Contact[]>(initial?.contacts ?? [{ name: "", email: "", isPrimary: true }]);
  const [saving, setSaving] = useState(false);

  function updateContact(idx: number, patch: Partial<Contact>) {
    setContactList((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function addContact() {
    setContactList((cs) => [...cs, { name: "", email: "", isPrimary: false }]);
  }
  function removeContact(idx: number) {
    setContactList((cs) => cs.filter((_, i) => i !== idx));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name,
      company: company || null,
      address: address || null,
      notes: notes || null,
      hourlyRate: hourlyRate || null,
      emailSubjectTemplate: emailSubjectTemplate || null,
      emailBodyTemplate: emailBodyTemplate || null,
      contacts: contactList,
    };
    const res = await fetch(initial ? `/api/clients/${initial.id}` : "/api/clients", {
      method: initial ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push("/clients");
      router.refresh();
    } else {
      setSaving(false);
      alert("Save failed");
    }
  }

  async function del() {
    if (!initial) return;
    if (!confirm(`Delete ${initial.name}? This deletes contacts too.`)) return;
    const res = await fetch(`/api/clients/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clients");
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
      </Field>
      <Field label="Company">
        <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Billing address">
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className={inputCls} />
      </Field>
      <Field label="Default hourly rate">
        <input value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} type="number" step="0.01" className={inputCls} />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Contacts</legend>
        {contactList.map((c, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Name"
              value={c.name}
              onChange={(e) => updateContact(idx, { name: e.target.value })}
              className={inputCls + " flex-1 min-w-32"}
            />
            <input
              placeholder="Email"
              type="email"
              value={c.email}
              onChange={(e) => updateContact(idx, { email: e.target.value })}
              className={inputCls + " flex-1 min-w-32"}
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={c.isPrimary}
                onChange={(e) => updateContact(idx, { isPrimary: e.target.checked })}
              />
              Primary
            </label>
            <button type="button" onClick={() => removeContact(idx)} className="text-sm text-red-600">
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addContact} className="text-sm text-zinc-600 dark:text-zinc-400">
          + Add contact
        </button>
      </fieldset>

      <Field label="Email subject template (optional, overrides default)">
        <input value={emailSubjectTemplate} onChange={(e) => setEmailSubjectTemplate(e.target.value)} className={inputCls} placeholder="Invoice {{number}} from {{businessName}}" />
      </Field>
      <Field label="Email body template (optional, overrides default)">
        <textarea value={emailBodyTemplate} onChange={(e) => setEmailBodyTemplate(e.target.value)} rows={6} className={inputCls} placeholder="Hi {{contactName}},&#10;&#10;Please find attached invoice {{number}}..." />
      </Field>
      <Field label="Notes">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
      </Field>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
          {saving ? "Saving..." : "Save"}
        </button>
        {initial && (
          <button type="button" onClick={del} className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600">
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex">{children}</div>
    </label>
  );
}
