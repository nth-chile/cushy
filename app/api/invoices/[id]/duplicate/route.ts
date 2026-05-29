import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, settings } from "@/lib/db/schema";
import { eq, max } from "drizzle-orm";
import { todayISO } from "@/lib/time";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sourceId = Number(id);
  // The client sends its local "today"; fall back to the server's date if absent.
  const { issuedDate } = await req.json().catch(() => ({}));
  const [source] = await db.select().from(invoices).where(eq(invoices.id, sourceId));
  if (!source) return NextResponse.json({ error: "not found" }, { status: 404 });

  const sourceItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, sourceId))
    .orderBy(invoiceLineItems.position);

  const [setting] = await db.select().from(settings).where(eq(settings.id, 1));
  const start = setting?.invoiceNumberStart ?? 1000;
  const [maxRow] = await db.select({ max: max(invoices.number) }).from(invoices);
  const nextNumber = Math.max(start, (maxRow?.max ?? start - 1) + 1);

  const [created] = await db
    .insert(invoices)
    .values({
      number: nextNumber,
      clientId: source.clientId,
      issuedDate: typeof issuedDate === "string" && issuedDate ? issuedDate : todayISO(),
      status: "draft",
    })
    .returning();

  if (sourceItems.length) {
    await db.insert(invoiceLineItems).values(
      sourceItems.map((it, idx) => ({
        invoiceId: created.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        position: idx,
      })),
    );
  }

  return NextResponse.json(created);
}
