import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, timeEntries, clients, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
  const clientContacts = await db.select().from(contacts).where(eq(contacts.clientId, invoice.clientId));
  const items = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(invoiceLineItems.position);

  return NextResponse.json({ ...invoice, client: { ...client, contacts: clientContacts }, lineItems: items });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  const body = await req.json();

  if (body.lineItems !== undefined) {
    await db.update(timeEntries)
      .set({ invoiceLineItemId: null })
      .where(eq(timeEntries.invoiceLineItemId, invoiceId));
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
    if (Array.isArray(body.lineItems) && body.lineItems.length) {
      await db.insert(invoiceLineItems).values(
        body.lineItems.map((it: { description: string; quantity: number | string; unitPrice: number | string }, idx: number) => ({
          invoiceId,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          position: idx,
        }))
      );
    }
  }

  const update: Partial<typeof invoices.$inferInsert> = {};
  if (body.issuedDate !== undefined) update.issuedDate = body.issuedDate;
  if (body.paidDate !== undefined) update.paidDate = body.paidDate || null;
  if (body.status !== undefined) update.status = body.status;

  if (Object.keys(update).length) {
    await db.update(invoices).set(update).where(eq(invoices.id, invoiceId));
  }

  const [updated] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(invoices).where(eq(invoices.id, Number(id)));
  return NextResponse.json({ ok: true });
}
