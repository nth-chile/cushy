"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, lineItemTotal, renderTemplate } from "@/lib/invoice";

type Invoice = {
  id: number;
  number: number;
  clientId: number;
  issuedDate: string;
  dueDate: string | null;
  paidDate: string | null;
  notes: string | null;
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
  defaults,
}: {
  invoice: Invoice;
  client: Client;
  lineItems: LineItem[];
  defaults: { subject: string; body: string; businessName: string };
}) {
  const router = useRouter();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [items, setItems] = useState(initialItems);
  const [showSend, setShowSend] = useState(false);

  const total = items.reduce((sum, it) => sum + lineItemTotal(it), 0);
  const isPaid = !!invoice.paidDate;
  const isSent = invoice.status === "sent" || isPaid;

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

  async function markPaid() {
    const today = new Date().toISOString().slice(0, 10);
    await patch({ paidDate: today, status: "paid" } as Partial<Invoice>);
  }

  async function unmarkPaid() {
    await patch({ paidDate: null, status: invoice.status === "paid" ? "sent" : invoice.status } as Partial<Invoice>);
  }

  async function deleteInvoice() {
    if (!confirm(`Delete invoice #${invoice.number}?`)) return;
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
          <div className="text-sm text-zinc-500">{client.name}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Preview PDF
          </a>
          <button
            onClick={() => setShowSend(true)}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white"
          >
            {isSent ? "Resend" : "Send"}
          </button>
          {isPaid ? (
            <button onClick={unmarkPaid} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
              Unmark paid
            </button>
          ) : (
            <button onClick={markPaid} className="rounded-md bg-green-600 px-3 py-1.5 text-sm text-white">
              Mark paid
            </button>
          )}
          <button onClick={deleteInvoice} className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600">
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Issued">
          <input type="date" value={invoice.issuedDate} onChange={(e) => patch({ issuedDate: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Due">
          <input type="date" value={invoice.dueDate ?? ""} onChange={(e) => patch({ dueDate: e.target.value || null })} className={inputCls} />
        </Field>
        <Field label="Paid">
          <input type="date" value={invoice.paidDate ?? ""} onChange={(e) => patch({ paidDate: e.target.value || null, status: e.target.value ? "paid" : invoice.status } as Partial<Invoice>)} className={inputCls} />
        </Field>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-medium">Line items</h2>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={it.id} className="grid grid-cols-12 gap-2">
              <input
                value={it.description}
                onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))}
                onBlur={() => saveItems(items)}
                className={inputCls + " col-span-6"}
              />
              <input
                type="number"
                step="0.01"
                value={it.quantity}
                onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
                onBlur={() => saveItems(items)}
                className={inputCls + " col-span-2"}
              />
              <input
                type="number"
                step="0.01"
                value={it.unitPrice}
                onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, unitPrice: e.target.value } : x)))}
                onBlur={() => saveItems(items)}
                className={inputCls + " col-span-2"}
              />
              <div className="col-span-1 self-center text-right text-sm">{formatMoney(lineItemTotal(it))}</div>
              <button
                onClick={() => saveItems(items.filter((_, i) => i !== idx))}
                className="col-span-1 text-sm text-red-600"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() =>
              saveItems([
                ...items,
                { id: -Date.now(), description: "", quantity: "1", unitPrice: "0", position: items.length },
              ])
            }
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            + Add line
          </button>
          <div className="flex justify-end pt-2 text-sm font-medium">Total: {formatMoney(total)}</div>
        </div>
      </div>

      <Field label="Notes">
        <textarea
          defaultValue={invoice.notes ?? ""}
          onBlur={(e) => patch({ notes: e.target.value })}
          rows={3}
          className={inputCls}
        />
      </Field>

      {showSend && (
        <SendDialog
          invoice={invoice}
          client={client}
          defaults={defaults}
          onClose={() => setShowSend(false)}
          onSent={() => {
            setShowSend(false);
            patch({ status: "sent" });
          }}
        />
      )}
    </div>
  );
}

function SendDialog({
  invoice,
  client,
  defaults,
  onClose,
  onSent,
}: {
  invoice: Invoice;
  client: Client;
  defaults: { subject: string; body: string; businessName: string };
  onClose: () => void;
  onSent: () => void;
}) {
  const subjectTemplate = client.emailSubjectTemplate || defaults.subject;
  const bodyTemplate = client.emailBodyTemplate || defaults.body;

  const primary = client.contacts.find((c) => c.isPrimary) ?? client.contacts[0];
  const vars = {
    number: invoice.number,
    businessName: defaults.businessName,
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
      <div className="w-full max-w-2xl space-y-4 rounded-lg bg-white p-6 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Send invoice #{invoice.number}</h2>
          <button onClick={onClose} className="text-zinc-500">×</button>
        </div>

        <Field label="To">
          <ContactPicker
            contacts={client.contacts}
            selected={to}
            onChange={setTo}
          />
        </Field>
        <Field label="Cc (optional)">
          <ContactPicker
            contacts={client.contacts}
            selected={cc}
            onChange={setCc}
          />
        </Field>
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Body">
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={inputCls} />
        </Field>
        <p className="text-xs text-zinc-500">PDF will be attached automatically. Sends from your Gmail.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700">
            Cancel
          </button>
          <button
            onClick={send}
            disabled={sending || to.length === 0}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
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
          <label key={c.id} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(c.email)}
              onChange={(e) =>
                onChange(e.target.checked ? [...selected, c.email] : selected.filter((x) => x !== c.email))
              }
            />
            {c.name} <span className="text-zinc-500">({c.email})</span>
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          placeholder="Add another email"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          className={inputCls + " flex-1"}
        />
        <button
          type="button"
          onClick={() => {
            if (extra.includes("@")) {
              onChange([...selected, extra]);
              setExtra("");
            }
          }}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
        >
          Add
        </button>
      </div>
      {selected.filter((e) => !contacts.some((c) => c.email === e)).map((e) => (
        <div key={e} className="text-xs text-zinc-500">
          + {e}{" "}
          <button onClick={() => onChange(selected.filter((x) => x !== e))} className="text-red-600">×</button>
        </div>
      ))}
    </div>
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
