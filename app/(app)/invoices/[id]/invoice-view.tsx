"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Checkbox,
  Input,
  Label,
  TextArea,
  TextField,
  buttonVariants,
} from "@heroui/react";
import { formatMoney, lineItemTotal, renderTemplate } from "@/lib/invoice";
import { todayISO } from "@/lib/time";
import { StatusDropdown } from "../status-dropdown";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Invoice = {
  id: number;
  number: number;
  clientId: number;
  issuedDate: string;
  paidDate: string | null;
  status: string;
};
type LineItem = { id: number; description: string; quantity: string; unitPrice: string; position: number };
type Contact = { id: number; name: string; email: string; isPrimary: boolean };
type Client = {
  id: number;
  name: string;
  company: string | null;
  emailSubjectTemplate: string | null;
  emailBodyTemplate: string | null;
  contacts: Contact[];
};

export default function InvoiceView({
  invoice: initialInvoice,
  client,
  lineItems: initialItems,
  businessName,
}: {
  invoice: Invoice;
  client: Client;
  lineItems: LineItem[];
  businessName: string;
}) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [items, setItems] = useState(initialItems);
  const [showSend, setShowSend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const total = items.reduce((sum, it) => sum + lineItemTotal(it), 0);

  async function patch(update: Partial<Invoice>) {
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      const updated = await res.json();
      setInvoice(updated);
      router.refresh();
    }
  }

  async function saveItems(newItems: LineItem[]) {
    setItems(newItems);
    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineItems: newItems.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
      }),
    });
  }

  async function duplicate() {
    const res = await fetch(`/api/invoices/${invoice.id}/duplicate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issuedDate: todayISO() }),
    });
    if (res.ok) {
      const created = await res.json();
      router.push(`/invoices/${created.id}`);
    }
  }

  async function deleteInvoice() {
    setConfirmDelete(false);
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/invoices");
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invoice #{invoice.number}</h1>
          <div className="text-sm text-muted">{client.name}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Preview PDF
          </a>
          <Button variant="primary" size="sm" onPress={() => setShowSend(true)}>
            Compose email
          </Button>
          <StatusDropdown id={invoice.id} status={invoice.paidDate ? "paid" : invoice.status} />
          <Button variant="outline" size="sm" onPress={duplicate}>
            Duplicate
          </Button>
          <Button variant="danger" size="sm" onPress={() => setConfirmDelete(true)}>
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField value={invoice.issuedDate} onChange={(v) => patch({ issuedDate: v })}>
          <Label>Issued</Label>
          <Input type="date" />
        </TextField>
        <TextField
          value={invoice.paidDate ?? ""}
          onChange={(v) => patch({ paidDate: v || null, status: v ? "paid" : invoice.status } as Partial<Invoice>)}
        >
          <Label>Paid</Label>
          <Input type="date" />
        </TextField>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Line items</h2>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className="grid grid-cols-12 gap-2">
              <TextField
                aria-label="Description"
                value={it.description}
                onChange={(v) => setItems(items.map((x, i) => (i === idx ? { ...x, description: v } : x)))}
                className="col-span-6"
              >
                <Input onBlur={() => saveItems(items)} />
              </TextField>
              <TextField
                aria-label="Quantity"
                value={it.quantity}
                onChange={(v) => setItems(items.map((x, i) => (i === idx ? { ...x, quantity: v } : x)))}
                className="col-span-2"
              >
                <Input type="number" step="0.01" onBlur={() => saveItems(items)} />
              </TextField>
              <TextField
                aria-label="Unit price"
                value={it.unitPrice}
                onChange={(v) => setItems(items.map((x, i) => (i === idx ? { ...x, unitPrice: v } : x)))}
                className="col-span-2"
              >
                <Input type="number" step="0.01" onBlur={() => saveItems(items)} />
              </TextField>
              <div className="col-span-1 self-center text-right text-sm">{formatMoney(lineItemTotal(it))}</div>
              <Button
                variant="ghost"
                size="sm"
                className="col-span-1 text-danger"
                onPress={() => saveItems(items.filter((_, i) => i !== idx))}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onPress={() =>
              saveItems([
                ...items,
                { id: -Date.now(), description: "", quantity: "1", unitPrice: "0", position: items.length },
              ])
            }
          >
            + Add line
          </Button>
          <div className="flex justify-end pt-2 text-sm font-medium">Total: {formatMoney(total)}</div>
        </div>
      </div>

      {showSend && (
        <SendDialog
          invoice={invoice}
          client={client}
          businessName={businessName}
          onClose={() => setShowSend(false)}
          onSent={() => {
            setShowSend(false);
            setInvoice((inv) => (inv.status === "draft" && !inv.paidDate ? { ...inv, status: "sent" } : inv));
            router.refresh();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete invoice #${invoice.number}?`}
          onConfirm={deleteInvoice}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

function SendDialog({
  invoice,
  client,
  businessName,
  onClose,
  onSent,
}: {
  invoice: Invoice;
  client: Client;
  businessName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const subjectTemplate = client.emailSubjectTemplate ?? "";
  const bodyTemplate = client.emailBodyTemplate ?? "";

  const primary = client.contacts.find((c) => c.isPrimary) ?? client.contacts[0];
  const vars = {
    number: invoice.number,
    businessName,
    contactName: primary?.name ?? "",
    clientName: client.name,
  };

  const [to, setTo] = useState<string[]>(client.contacts.filter((c) => c.isPrimary).map((c) => c.email));
  const [cc, setCc] = useState<string[]>([]);
  const [subject, setSubject] = useState(renderTemplate(subjectTemplate, vars));
  const [body, setBody] = useState(renderTemplate(bodyTemplate, vars));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    setSending(true);
    setError("");
    const res = await fetch(`/api/invoices/${invoice.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, cc, subject, body }),
    });
    if (res.ok) {
      onSent();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Send failed");
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl space-y-4 rounded-lg bg-surface-secondary p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send invoice #{invoice.number}</h2>
          <Button variant="ghost" size="sm" onPress={onClose}>×</Button>
        </div>

        <div className="block space-y-1">
          <span className="text-sm font-medium">To</span>
          <ContactPicker contacts={client.contacts} selected={to} onChange={setTo} />
        </div>
        <div className="block space-y-1">
          <span className="text-sm font-medium">Cc (optional)</span>
          <ContactPicker contacts={client.contacts} selected={cc} onChange={setCc} />
        </div>
        <TextField value={subject} onChange={setSubject}>
          <Label>Subject</Label>
          <Input />
        </TextField>
        <TextField value={body} onChange={setBody}>
          <Label>Body</Label>
          <TextArea rows={8} />
        </TextField>
        <p className="text-xs text-muted">PDF will be attached automatically. Sends from your Gmail.</p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onPress={send} isDisabled={sending || to.length === 0}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContactPicker({
  contacts,
  selected,
  onChange,
}: {
  contacts: Contact[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [extra, setExtra] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {contacts.map((c) => (
          <Checkbox
            key={c.id}
            isSelected={selected.includes(c.email)}
            onChange={(checked) =>
              onChange(checked ? [...selected, c.email] : selected.filter((x) => x !== c.email))
            }
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label>
                {c.name} <span className="text-muted">({c.email})</span>
              </Label>
            </Checkbox.Content>
          </Checkbox>
        ))}
      </div>
      <div className="flex gap-2">
        <TextField aria-label="Add another email" value={extra} onChange={setExtra} className="flex-1">
          <Input placeholder="Add another email" />
        </TextField>
        <Button
          variant="outline"
          size="sm"
          onPress={() => {
            if (extra.includes("@")) {
              onChange([...selected, extra]);
              setExtra("");
            }
          }}
        >
          Add
        </Button>
      </div>
      {selected.filter((e) => !contacts.some((c) => c.email === e)).map((e) => (
        <div key={e} className="text-xs text-muted">
          + {e}{" "}
          <Button variant="ghost" size="sm" className="text-danger" onPress={() => onChange(selected.filter((x) => x !== e))}>
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}
