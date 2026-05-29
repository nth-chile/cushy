"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Key } from "@heroui/react";
import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { todayISO } from "@/lib/time";
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
  const [items, setItems] = useState<LineItem[]>([]);
  const [uninvoicedEntries, setUninvoicedEntries] = useState<TimeEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const client = useMemo(() => clients.find((c) => c.id === clientId), [clientId, clients]);
  const defaultRate = client?.hourlyRate ?? "0";

  useEffect(() => {
    if (!clientId) {
      // clear stale results when no client is selected
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="block space-y-1">
          <span className="text-sm font-medium">Client</span>
          <Select
            aria-label="Client"
            value={clientId === "" ? null : String(clientId)}
            onChange={(k: Key | null) => setClientId(k ? Number(k) : "")}
            className="w-full"
          >
            <Select.Trigger className="border border-default bg-surface-secondary">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {clients.map((c) => (
                  <ListBox.Item key={c.id} id={String(c.id)} textValue={c.name}>
                    {c.name}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
        <TextField value={issuedDate} onChange={setIssuedDate}>
          <Label>Issued</Label>
          <Input type="date" />
        </TextField>
      </div>

      {clientId && uninvoicedEntries.length > 0 && (
        <div className="rounded-lg border border-default p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Uninvoiced time ({uninvoicedEntries.length})</div>
            <Button variant="ghost" size="sm" onPress={() => importEntries(uninvoicedEntries)}>
              Import all as line items
            </Button>
          </div>
          <ul className="divide-y divide-default text-sm">
            {uninvoicedEntries.map((e) => {
              const alreadyImported = items.some((it) => it.fromTimeEntryId === e.id);
              const hours = hoursForEntry(e);
              return (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex-1">
                    <div>{new Date(e.startedAt).toLocaleString()}</div>
                    {e.notes && <div className="text-muted">{e.notes}</div>}
                  </div>
                  <div className="font-mono">{hours.toFixed(2)}h</div>
                  <Button
                    variant="outline"
                    size="sm"
                    isDisabled={alreadyImported}
                    onPress={() => importEntries([e])}
                  >
                    {alreadyImported ? "Imported" : "Import"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Line items</h2>
          <Button variant="ghost" size="sm" onPress={addBlankItem}>+ Add line</Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted">No line items yet.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <TextField
                  aria-label="Description"
                  value={it.description}
                  onChange={(v) => updateItem(idx, { description: v })}
                  className="col-span-6"
                >
                  <Input placeholder="Description" />
                </TextField>
                <TextField
                  aria-label="Quantity"
                  value={it.quantity}
                  onChange={(v) => updateItem(idx, { quantity: v })}
                  className="col-span-2"
                >
                  <Input type="number" step="0.01" placeholder="Qty" />
                </TextField>
                <TextField
                  aria-label="Unit price"
                  value={it.unitPrice}
                  onChange={(v) => updateItem(idx, { unitPrice: v })}
                  className="col-span-2"
                >
                  <Input type="number" step="0.01" placeholder="Price" />
                </TextField>
                <div className="col-span-1 self-center text-right text-sm">
                  {formatMoney(lineItemTotal(it))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="col-span-1 text-danger"
                  onPress={() => removeItem(idx)}
                >
                  ×
                </Button>
              </div>
            ))}
            <div className="flex justify-end pt-2 text-sm font-medium">
              Total: {formatMoney(total)}
            </div>
          </div>
        )}
      </div>

      <Button
        variant="primary"
        onPress={save}
        isDisabled={saving || !clientId || items.length === 0}
      >
        {saving ? "Saving..." : "Save invoice"}
      </Button>
    </div>
  );
}
