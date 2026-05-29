"use client";

import { useState } from "react";
import { Button, Input, Label, TextField } from "@heroui/react";

type Settings = {
  id: number;
  businessName: string | null;
  businessEmail: string | null;
  invoiceNumberStart: number;
  gmailUser: string | null;
} | null;

export default function SettingsForm({ initial }: { initial: Settings }) {
  const [businessName, setBusinessName] = useState(initial?.businessName ?? "");
  const [businessEmail, setBusinessEmail] = useState(initial?.businessEmail ?? "");
  const [invoiceNumberStart, setInvoiceNumberStart] = useState(String(initial?.invoiceNumberStart ?? 1000));
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
        businessEmail,
        invoiceNumberStart: Number(invoiceNumberStart),
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
        <TextField value={businessName} onChange={setBusinessName}>
          <Label>Business name</Label>
          <Input />
        </TextField>
        <TextField value={businessEmail} onChange={setBusinessEmail}>
          <Label>Business email</Label>
          <Input type="email" />
        </TextField>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Invoicing</h2>
        <TextField value={invoiceNumberStart} onChange={setInvoiceNumberStart}>
          <Label>Starting invoice number (next invoice will be at least this)</Label>
          <Input type="number" />
        </TextField>
        <p className="text-xs text-muted">
          Email templates are set per client on each client&apos;s page.
        </p>
      </section>

      <div className="flex items-center gap-3">
        <Button variant="primary" isDisabled={saving} type="submit">
          {saving ? "Saving..." : "Save"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </form>
  );
}
