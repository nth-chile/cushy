"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Input, Label, TextArea, TextField } from "@heroui/react";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Contact = { id?: number; name: string; email: string; isPrimary: boolean };
type ClientInitial = {
  id: number;
  name: string;
  company: string | null;
  hourlyRate: string | null;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  contacts: Contact[];
};

export default function ClientForm({ initial }: { initial?: ClientInitial }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [hourlyRate, setHourlyRate] = useState(initial?.hourlyRate ?? "");
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState(initial?.emailSubjectTemplate ?? "");
  const [emailBodyTemplate, setEmailBodyTemplate] = useState(initial?.emailBodyTemplate ?? "");
  const [contactList, setContactList] = useState<Contact[]>(initial?.contacts ?? [{ name: "", email: "", isPrimary: true }]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    setConfirmDelete(false);
    const res = await fetch(`/api/clients/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clients");
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <TextField value={name} onChange={setName} name="name" isRequired>
        <Label>Name</Label>
        <Input />
      </TextField>
      <TextField value={company} onChange={setCompany} name="company">
        <Label>Company</Label>
        <Input />
      </TextField>
      <TextField value={hourlyRate} onChange={setHourlyRate} name="hourlyRate">
        <Label>Default hourly rate</Label>
        <Input type="number" step="0.01" />
      </TextField>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Contacts</legend>
        {contactList.map((c, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <TextField
              aria-label="Name"
              value={c.name}
              onChange={(v) => updateContact(idx, { name: v })}
              className="flex-1 min-w-32"
            >
              <Input placeholder="Name" />
            </TextField>
            <TextField
              aria-label="Email"
              value={c.email}
              onChange={(v) => updateContact(idx, { email: v })}
              className="flex-1 min-w-32"
            >
              <Input type="email" placeholder="Email" />
            </TextField>
            <Checkbox
              isSelected={c.isPrimary}
              onChange={(v) => updateContact(idx, { isPrimary: v })}
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>Primary</Label>
              </Checkbox.Content>
            </Checkbox>
            <Button variant="danger-soft" size="sm" onPress={() => removeContact(idx)}>
              Remove
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" onPress={addContact}>
          + Add contact
        </Button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Invoice email template</legend>
        <TextField value={emailSubjectTemplate} onChange={setEmailSubjectTemplate} name="emailSubjectTemplate">
          <Label>Subject</Label>
          <Input placeholder="Invoice {{number}} from {{businessName}}" />
        </TextField>
        <TextField value={emailBodyTemplate} onChange={setEmailBodyTemplate} name="emailBodyTemplate">
          <Label>Body</Label>
          <TextArea rows={6} placeholder="Hi {{contactName}},&#10;&#10;Please find attached invoice {{number}}..." />
        </TextField>
        <p className="text-xs text-muted">
          Available variables: <code>{"{{number}}"}</code>, <code>{"{{businessName}}"}</code>,{" "}
          <code>{"{{contactName}}"}</code>, <code>{"{{clientName}}"}</code>
        </p>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" isDisabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {initial && (
          <Button type="button" variant="danger" onPress={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </div>

      {confirmDelete && initial && (
        <ConfirmDialog
          title={`Delete ${initial.name}?`}
          message="This deletes their contacts too."
          onConfirm={del}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </form>
  );
}
