import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, timeEntries, clients, settings } from "@/lib/db/schema";
import { desc, eq, max, sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      clientId: invoices.clientId,
      clientName: clients.name,
      issuedDate: invoices.issuedDate,
      paidDate: invoices.paidDate,
      status: invoices.status,
      total: sql<string>`COALESCE(SUM(${invoiceLineItems.quantity} * ${invoiceLineItems.unitPrice}), 0)::text`,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(invoiceLineItems, eq(invoiceLineItems.invoiceId, invoices.id))
    .groupBy(invoices.id, clients.name)
    .orderBy(desc(invoices.number));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { clientId, issuedDate, lineItems, timeEntryIds } = body;
  if (!clientId || !issuedDate) {
    return NextResponse.json({ error: "clientId and issuedDate required" }, { status: 400 });
  }

  const [setting] = await db.select().from(settings).where(eq(settings.id, 1));
  const start = setting?.invoiceNumberStart ?? 1000;
  const [maxRow] = await db.select({ max: max(invoices.number) }).from(invoices);
  const nextNumber = Math.max(start, (maxRow?.max ?? start - 1) + 1);

  const [invoice] = await db
    .insert(invoices)
    .values({
      number: nextNumber,
      clientId: Number(clientId),
      issuedDate,
      status: "draft",
    })
    .returning();

  const items = Array.isArray(lineItems) ? lineItems : [];
  if (items.length) {
    const inserted = await db
      .insert(invoiceLineItems)
      .values(
        items.map((it: { description: string; quantity: number | string; unitPrice: number | string }, idx: number) => ({
          invoiceId: invoice.id,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          position: idx,
        }))
      )
      .returning();

    if (Array.isArray(timeEntryIds) && timeEntryIds.length) {
      const map: Record<number, number> = body.timeEntryToLineItem ?? {};
      for (const teId of timeEntryIds) {
        const lineItemIdx = map[teId];
        const lineItem = inserted[lineItemIdx];
        if (lineItem) {
          await db
            .update(timeEntries)
            .set({ invoiceLineItemId: lineItem.id })
            .where(eq(timeEntries.id, Number(teId)));
        }
      }
    }
  }

  return NextResponse.json(invoice);
}
