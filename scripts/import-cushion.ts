/**
 * Import a Cushion data export into cushy.
 *
 * Usage:
 *   npx tsx scripts/import-cushion.ts <path-to-extracted-cushion-export-dir>
 *
 * The directory should contain clients.csv, contacts.csv, invoices.csv,
 * entries.csv, etc. (the contents of a Cushion export zip, unzipped).
 *
 * This is destructive in the sense that it inserts new rows. Run against
 * an empty database for a clean result.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";

try {
  process.loadEnvFile(".env.local");
} catch {}

import { db } from "../lib/db";
import { clients, contacts, timeEntries, invoices, invoiceLineItems } from "../lib/db/schema";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: tsx scripts/import-cushion.ts <export-dir>");
  process.exit(1);
}

function readCsv(name: string): Record<string, string>[] {
  const raw = readFileSync(join(dir, name), "utf8");
  return parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true });
}

function parseTime(date: string, t: string): Date {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
  if (!m) throw new Error(`bad time: ${t}`);
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3].toLowerCase();
  if (ampm === "pm" && h !== 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return new Date(`${date}T${pad(h)}:${pad(min)}:00`);
}

async function main() {
  const clientRows = readCsv("clients.csv");
  const contactRows = readCsv("contacts.csv");
  const invoiceRows = readCsv("invoices.csv");
  const entryRows = readCsv("entries.csv");

  console.log(`Reading: ${clientRows.length} clients, ${contactRows.length} contacts, ${invoiceRows.length} invoices, ${entryRows.length} entries`);

  // Insert clients, build name -> id map
  const clientIdByName = new Map<string, number>();
  for (const r of clientRows) {
    const [client] = await db
      .insert(clients)
      .values({
        name: r.name,
        company: null,
        address: r.address || null,
        notes: r.note || null,
        hourlyRate: r.rate ? r.rate : null,
      })
      .returning();
    clientIdByName.set(r.name, client.id);
  }
  console.log(`Inserted ${clientIdByName.size} clients`);

  // Insert contacts; first contact per client = primary
  const contactsByClient = new Map<string, Array<typeof contactRows[number]>>();
  for (const r of contactRows) {
    if (!contactsByClient.has(r.client)) contactsByClient.set(r.client, []);
    contactsByClient.get(r.client)!.push(r);
  }
  let contactCount = 0;
  for (const [clientName, rows] of contactsByClient) {
    const clientId = clientIdByName.get(clientName);
    if (!clientId) continue;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.email) continue;
      await db.insert(contacts).values({
        clientId,
        name: r.name || r.email,
        email: r.email,
        isPrimary: i === 0,
      });
      contactCount++;
    }
  }
  console.log(`Inserted ${contactCount} contacts`);

  // Insert invoices + one summary line item each. Track first-line-item id per invoice
  // for later linking from entries.
  const lineItemIdByInvoiceKey = new Map<string, number>(); // key = `${clientId}::${number}`
  const lineItemsByClient = new Map<number, Array<{ id: number; issuedDate: string }>>();
  let usedNumbers = new Set<number>();
  for (const r of invoiceRows) {
    const clientId = clientIdByName.get(r.client);
    if (!clientId) continue;
    const numStr = r.number.replace(/[^\d]/g, "");
    let number = Number(numStr);
    if (!number) continue;
    while (usedNumbers.has(number)) number++; // dedupe in case of collisions
    usedNumbers.add(number);

    const amount = Number(r.amount || 0);
    const status = r.paid_on ? "paid" : "sent";

    const [inv] = await db
      .insert(invoices)
      .values({
        number,
        clientId,
        issuedDate: r.issued_on,
        dueDate: r.due_on || null,
        paidDate: r.paid_on || null,
        notes: r.note || null,
        status,
      })
      .returning();

    const description = r.project ? `${r.project}` : "Services";
    const [li] = await db
      .insert(invoiceLineItems)
      .values({
        invoiceId: inv.id,
        description,
        quantity: "1",
        unitPrice: String(amount),
        position: 0,
      })
      .returning();

    lineItemIdByInvoiceKey.set(`${clientId}::${number}`, li.id);
    if (!lineItemsByClient.has(clientId)) lineItemsByClient.set(clientId, []);
    lineItemsByClient.get(clientId)!.push({ id: li.id, issuedDate: inv.issuedDate });
  }
  console.log(`Inserted ${usedNumbers.size} invoices`);

  // Pre-sort lineItemsByClient by date for fast lookup
  for (const [, list] of lineItemsByClient) {
    list.sort((a, b) => a.issuedDate.localeCompare(b.issuedDate));
  }

  // Insert time entries. For billed entries, link to the closest invoice
  // for that client where issued_on >= entry.date.
  let entryCount = 0;
  let linkedCount = 0;
  const batchSize = 200;
  let batch: Array<typeof timeEntries.$inferInsert> = [];
  async function flush() {
    if (batch.length) {
      await db.insert(timeEntries).values(batch);
      batch = [];
    }
  }

  for (const r of entryRows) {
    const clientId = clientIdByName.get(r.client);
    if (!clientId) continue;
    let startedAt: Date, endedAt: Date;
    try {
      startedAt = parseTime(r.date, r.start);
      endedAt = parseTime(r.date, r.end);
    } catch {
      continue;
    }
    if (endedAt <= startedAt) endedAt = new Date(startedAt.getTime() + 60000);

    const noteParts: string[] = [];
    if (r.project) noteParts.push(`[${r.project}]`);
    if (r.note) noteParts.push(r.note);
    if (r.billable === "false") noteParts.push("(unbillable)");
    const notes = noteParts.join(" ") || null;

    let invoiceLineItemId: number | null = null;
    if (r.billed === "true") {
      const list = lineItemsByClient.get(clientId);
      if (list) {
        const found = list.find((x) => x.issuedDate >= r.date);
        if (found) {
          invoiceLineItemId = found.id;
          linkedCount++;
        }
      }
    }

    batch.push({ clientId, startedAt, endedAt, notes, invoiceLineItemId });
    if (batch.length >= batchSize) {
      await flush();
    }
    entryCount++;
  }
  await flush();
  console.log(`Inserted ${entryCount} time entries (${linkedCount} linked to existing invoices)`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
