"use client";

import { useCallback, useEffect, useState } from "react";
import type { Key } from "@heroui/react";
import { Button, Input, ListBox, Select, TextField } from "@heroui/react";
import { formatDuration, localDateInput, todayISO } from "@/lib/time";
import { ConfirmDialog } from "@/components/confirm-dialog";

type ClientOpt = { id: number; name: string };
type Entry = {
  id: number;
  clientId: number;
  clientName: string | null;
  startedAt: string;
  endedAt: string | null;
  notes: string | null;
  invoiceLineItemId: number | null;
};
type Timer = { id: number; clientId: number; startedAt: string; notes: string | null } | null;

export default function TimeView({ clients }: { clients: ClientOpt[] }) {
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [timer, setTimer] = useState<Timer>(null);
  const [now, setNow] = useState(() => Date.now());
  const [timerClientId, setTimerClientId] = useState<number | "">(clients[0]?.id ?? "");
  const [timerNotes, setTimerNotes] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [e, t] = await Promise.all([
      fetch(`/api/time-entries?date=${date}`).then((r) => r.json()),
      fetch(`/api/time-entries/timer`).then((r) => r.json()),
    ]);
    setEntries(e);
    setTimer(t);
  }, [date]);

  useEffect(() => {
    // load() only setStates after awaiting the fetch, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  async function startTimer() {
    if (!timerClientId) return;
    await fetch(`/api/time-entries/timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: timerClientId, notes: timerNotes }),
    });
    setTimerNotes("");
    load();
  }

  async function stopTimer() {
    await fetch(`/api/time-entries/timer`, { method: "DELETE" });
    load();
  }

  async function addManual() {
    if (!clients.length) return;
    const start = new Date(date + "T09:00:00");
    const end = new Date(date + "T10:00:00");
    await fetch(`/api/time-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: clients[0].id,
        startedAt: start.toISOString(),
        endedAt: end.toISOString(),
        notes: "",
      }),
    });
    load();
  }

  async function updateEntry(id: number, patch: Partial<Entry>) {
    await fetch(`/api/time-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  }

  async function deleteEntry(id: number) {
    setConfirmDeleteId(null);
    await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    load();
  }

  const dailyTotalMs = entries.reduce((sum, e) => {
    const start = new Date(e.startedAt).getTime();
    const end = e.endedAt ? new Date(e.endedAt).getTime() : now;
    return sum + Math.max(0, end - start);
  }, 0);

  const runningMs = timer ? now - new Date(timer.startedAt).getTime() : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Time</h1>
        <TextField value={date} onChange={setDate} aria-label="Date" className="w-40">
          <Input type="date" />
        </TextField>
      </div>

      <div className="rounded-lg border border-default p-4">
        {timer ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Running</div>
              <div className="text-2xl font-mono">{formatDuration(runningMs)}</div>
              <div className="text-sm">
                {clients.find((c) => c.id === timer.clientId)?.name ?? "—"}
                {timer.notes ? ` · ${timer.notes}` : ""}
              </div>
            </div>
            <Button variant="danger" size="sm" onPress={stopTimer}>
              Stop
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Client"
              value={timerClientId === "" ? null : timerClientId}
              onChange={(k: Key | null) => setTimerClientId(k == null ? "" : Number(k))}
              className="w-48"
            >
              <Select.Trigger className="border border-default bg-surface-secondary">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {clients.map((c) => (
                    <ListBox.Item key={c.id} id={c.id} textValue={c.name}>
                      {c.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <TextField
              value={timerNotes}
              onChange={setTimerNotes}
              aria-label="What are you working on?"
              className="flex-1 min-w-48"
            >
              <Input placeholder="What are you working on?" />
            </TextField>
            <Button variant="primary" size="sm" onPress={startTimer} isDisabled={!timerClientId}>
              Start
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">Total: {formatDuration(dailyTotalMs)}</div>
        <Button variant="ghost" size="sm" onPress={addManual} isDisabled={!clients.length}>
          + Add entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">No entries.</p>
      ) : (
        <ul className="divide-y divide-default rounded-lg border border-default">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} clients={clients} now={now} onChange={updateEntry} onDelete={setConfirmDeleteId} />
          ))}
        </ul>
      )}

      {confirmDeleteId !== null && (
        <ConfirmDialog
          title="Delete entry?"
          onConfirm={() => deleteEntry(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

function EntryRow({
  entry,
  clients,
  now,
  onChange,
  onDelete,
}: {
  entry: Entry;
  clients: ClientOpt[];
  now: number;
  onChange: (id: number, patch: Partial<Entry>) => void;
  onDelete: (id: number) => void;
}) {
  const start = new Date(entry.startedAt);
  const end = entry.endedAt ? new Date(entry.endedAt) : new Date(now);
  const ms = Math.max(0, end.getTime() - start.getTime());
  const isInvoiced = !!entry.invoiceLineItemId;

  return (
    <li className={`px-4 py-3 ${isInvoiced ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Client"
          value={entry.clientId}
          onChange={(k: Key | null) => {
            if (k != null) onChange(entry.id, { clientId: Number(k) });
          }}
          isDisabled={isInvoiced}
          className="w-48"
        >
          <Select.Trigger className="border border-default bg-surface-secondary">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {clients.map((c) => (
                <ListBox.Item key={c.id} id={c.id} textValue={c.name}>
                  {c.name}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <TextField
          value={localDateInput(start)}
          onChange={(v) => onChange(entry.id, { startedAt: new Date(v).toISOString() })}
          aria-label="Start"
          isDisabled={isInvoiced}
        >
          <Input type="datetime-local" />
        </TextField>
        <span className="text-sm">→</span>
        {entry.endedAt ? (
          <TextField
            value={localDateInput(end)}
            onChange={(v) => onChange(entry.id, { endedAt: new Date(v).toISOString() })}
            aria-label="End"
            isDisabled={isInvoiced}
          >
            <Input type="datetime-local" />
          </TextField>
        ) : (
          <span className="text-sm text-green-600">running</span>
        )}
        <span className="ml-auto font-mono text-sm">{formatDuration(ms)}</span>
        {!isInvoiced && (
          <Button variant="danger-soft" size="sm" onPress={() => onDelete(entry.id)} aria-label="Delete entry">
            ×
          </Button>
        )}
      </div>
      <TextField
        value={entry.notes ?? ""}
        onChange={(v) => onChange(entry.id, { notes: v })}
        aria-label="Notes"
        isDisabled={isInvoiced}
        className="mt-2 w-full"
      >
        <Input placeholder="Notes" />
      </TextField>
      {isInvoiced && <div className="mt-1 text-xs text-muted">Invoiced</div>}
    </li>
  );
}
