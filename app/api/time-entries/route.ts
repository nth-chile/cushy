import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries, clients } from "@/lib/db/schema";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const clientId = url.searchParams.get("clientId");
  const uninvoicedOnly = url.searchParams.get("uninvoiced") === "1";

  const conditions = [];
  if (date) {
    const start = new Date(date + "T00:00:00");
    const end = new Date(date + "T23:59:59.999");
    conditions.push(gte(timeEntries.startedAt, start));
    conditions.push(lte(timeEntries.startedAt, end));
  }
  if (clientId) conditions.push(eq(timeEntries.clientId, Number(clientId)));
  if (uninvoicedOnly) conditions.push(isNull(timeEntries.invoiceLineItemId));

  const rows = await db
    .select({
      id: timeEntries.id,
      clientId: timeEntries.clientId,
      clientName: clients.name,
      startedAt: timeEntries.startedAt,
      endedAt: timeEntries.endedAt,
      notes: timeEntries.notes,
      invoiceLineItemId: timeEntries.invoiceLineItemId,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(timeEntries.clientId, clients.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(timeEntries.startedAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, startedAt, endedAt, notes } = body;
  if (!clientId || !startedAt) {
    return NextResponse.json({ error: "clientId and startedAt required" }, { status: 400 });
  }
  const [entry] = await db
    .insert(timeEntries)
    .values({
      clientId: Number(clientId),
      startedAt: new Date(startedAt),
      endedAt: endedAt ? new Date(endedAt) : null,
      notes: notes ?? null,
    })
    .returning();
  return NextResponse.json(entry);
}
