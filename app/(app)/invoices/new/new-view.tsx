"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDuration, todayISO } from "@/lib/time";
import { formatMoney, lineItemTotal } from "@/lib/invoice";

type ClientOpt = { id: number; name: string; hourlyRate: string | null };
type TimeEntry = {
  id: number;
  clientId: number;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
};
type LineItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  fromTimeEntryId?: number;
};

function hoursForEntry(e: TimeEntry): number {
  if (!e.endedAt) return 0;
  const ms = new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime();
  return Math.max(0, ms / 3600000);
}

export default function NewInvoiceView({ clients }: { clients: ClientOpt[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState<number | "">(clients[0]?.id ?? "");
  const [issuedDate, setIssuedDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [uninvoicedEntries, setUninvoicedEntries] = useState<TimeEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const client = useMemo(() => clients.find((c) => c.id === clientId), [clientId, clients]);
  const defaultRate = client?.hourlyRate ?? "0";

  useEffect(() => {
    if (!clientId) {
      setUninvoicedEntries([]);
      return;
    }
    fetch(`/api/time-entries?clientId=${clientId}&uninvoiced=1`)
      .then((r) => r.json())
      .then((entries: TimeEntry[]) => {
        setUninvoicedEntries(entries.filter((e) => e.endedAt));
      });
  }, [clientId]);

  function importEntries(selected: TimeEntry[]) {
    const newItems: LineItem[] = selected.map((e) => {
      const hours = hoursForEntry(e);
      const date = new Date(e.startedAt).toLocaleDateString();
      return {
        description: e.notes ? `${date} — ${e.notes}` : date,
        quantity: hours.toFixed(2),
        unitPrice: defaultRate,
        fromTimeEntryId: e.id,
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  }

  function addBlankItem() {
    setItems((prev) => [...prev, { description: "", quantity: "1", unitPrice: defaultRate }]);
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!clientId || items.length === 0) return;
    setSaving(true);
    const timeEntryIds = items
      .map((it) => it.fromTimeEntryId)
      .filter((id): id is number => typeof id === "number");
    const timeEntryToLineItem: Record<number, number> = {};
    items.forEach((it, idx) => {
      if (it.fromTimeEntryId !== undefined) timeEntryToLineItem[it.fromTimeEntryId] = idx;
    });

    const res = await fetch(`/api/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        issuedDate,
        dueDate: dueDate || null,
        notes: notes || null,
        lineItems: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
        })),
        timeEntryIds,
        timeEntryToLineItem,
      }),
    });
    if (res.ok) {
      const inv = await res.json();
      router.push(`/invoices/${inv.id}`);
    } else {
      setSaving(false);
      alert("Save failed");
    }
  }

  const total = items.reduce((sum, it) => sum + lineItemTotal(it), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New invoice</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Client">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}
            className={inputCls}
          >
            {clients.length === 0 && <option value="">No clients</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Issued">
          <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Due">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
        </Field>
      </div>

      {clientId && uninvoicedEntries.length > 0 && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Uninvoiced time ({uninvoicedEntries.length})</div>
            <button
              onClick={() => importEntries(uninvoicedEntries)}
              className="text-sm text-blue-600"
            >
              Import all as line items
            </button>
          </div>
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {uninvoicedEntries.map((e) => {
              const alreadyImported = items.some((it) => it.fromTimeEntryId === e.id);
              const hours = hoursForEntry(e);
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex-1">
                    <div>{new Date(e.startedAt).toLocaleString()}</div>
                    {e.notes && <div className="text-zinc-500">{e.notes}</div>}
                  </div>
                  <div className="font-mono">{hours.toFixed(2)}h</div>
                  <button
                    disabled={alreadyImported}
                    onClick={() => importEntries([e])}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs disabled:opacity-30 dark:border-zinc-700"
                  >
                    {alreadyImported ? "Imported" : "Import"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Line items</h2>
          <button onClick={addBlankItem} className="text-sm text-zinc-600 dark:text-zinc-400">+ Add line</button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">No line items yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  className={inputCls + " col-span-6"}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Qty"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                  className={inputCls + " col-span-2"}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                  className={inputCls + " col-span-2"}
                />
                <div className="col-span-1 self-center text-right text-sm">
                  {formatMoney(lineItemTotal(it))}
                </div>
                <button onClick={() => removeItem(idx)} className="col-span-1 text-sm text-red-600">×</button>
              </div>
            ))}
            <div className="flex justify-end pt-2 text-sm font-medium">
              Total: {formatMoney(total)}
            </div>
          </div>
        )}
      </div>

      <Field label="Notes (shown on invoice)">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} />
      </Field>

      <button
        onClick={save}
        disabled={saving || !clientId || items.length === 0}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {saving ? "Saving..." : "Save invoice"}
      </button>
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
