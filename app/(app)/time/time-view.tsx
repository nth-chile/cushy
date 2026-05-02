"use client";

import { useEffect, useState } from "react";
import { formatDuration, localDateInput, todayISO } from "@/lib/time";

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
  const [now, setNow] = useState(Date.now());
  const [timerClientId, setTimerClientId] = useState<number | "">(clients[0]?.id ?? "");
  const [timerNotes, setTimerNotes] = useState("");

  async function load() {
    const [e, t] = await Promise.all([
      fetch(`/api/time-entries?date=${date}`).then((r) => r.json()),
      fetch(`/api/time-entries/timer`).then((r) => r.json()),
    ]);
    setEntries(e);
    setTimer(t);
  }

  useEffect(() => {
    load();
  }, [date]);

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
    if (!confirm("Delete entry?")) return;
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
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        {timer ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-zinc-500">Running</div>
              <div className="text-2xl font-mono">{formatDuration(runningMs)}</div>
              <div className="text-sm">
                {clients.find((c) => c.id === timer.clientId)?.name ?? "—"}
                {timer.notes ? ` · ${timer.notes}` : ""}
              </div>
            </div>
            <button onClick={stopTimer} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white">
              Stop
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={timerClientId}
              onChange={(e) => setTimerClientId(e.target.value ? Number(e.target.value) : "")}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {clients.length === 0 && <option value="">No clients yet</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              placeholder="What are you working on?"
              value={timerNotes}
              onChange={(e) => setTimerNotes(e.target.value)}
              className="flex-1 min-w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              onClick={startTimer}
              disabled={!timerClientId}
              className="rounded-md bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Start
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-500">Total: {formatDuration(dailyTotalMs)}</div>
        <button onClick={addManual} disabled={!clients.length} className="text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-50">
          + Add entry
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No entries.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} clients={clients} now={now} onChange={updateEntry} onDelete={deleteEntry} />
          ))}
        </ul>
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
        <select
          value={entry.clientId}
          onChange={(ev) => onChange(entry.id, { clientId: Number(ev.target.value) })}
          disabled={isInvoiced}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={localDateInput(start)}
          onChange={(ev) => onChange(entry.id, { startedAt: new Date(ev.target.value).toISOString() })}
          disabled={isInvoiced}
          className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="text-sm">→</span>
        {entry.endedAt ? (
          <input
            type="datetime-local"
            value={localDateInput(end)}
            onChange={(ev) => onChange(entry.id, { endedAt: new Date(ev.target.value).toISOString() })}
            disabled={isInvoiced}
            className="rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        ) : (
          <span className="text-sm text-green-600">running</span>
        )}
        <span className="ml-auto font-mono text-sm">{formatDuration(ms)}</span>
        {!isInvoiced && (
          <button onClick={() => onDelete(entry.id)} className="text-sm text-red-600">×</button>
        )}
      </div>
      <input
        placeholder="Notes"
        value={entry.notes ?? ""}
        onChange={(ev) => onChange(entry.id, { notes: ev.target.value })}
        disabled={isInvoiced}
        className="mt-2 w-full rounded-md border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      {isInvoiced && <div className="mt-1 text-xs text-zinc-500">Invoiced</div>}
    </li>
  );
}
