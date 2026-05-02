import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, clients, contacts, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { InvoicePDF } from "@/lib/pdf/invoice";
import { renderToBuffer } from "@react-pdf/renderer";
import { sendInvoiceEmail } from "@/lib/email";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  const { to, cc, subject, body } = await req.json();

  if (!Array.isArray(to) || to.length === 0) {
    return NextResponse.json({ error: "at least one recipient required" }, { status: 400 });
  }
  if (!subject || !body) {
    return NextResponse.json({ error: "subject and body required" }, { status: 400 });
  }

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
  const items = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(invoiceLineItems.position);
  const [setting] = await db.select().from(settings).where(eq(settings.id, 1));

  const buffer = await renderToBuffer(
    InvoicePDF({
      data: {
        number: invoice.number,
        issuedDate: invoice.issuedDate,
        dueDate: invoice.dueDate,
        notes: invoice.notes,
        business: {
          name: setting?.businessName ?? null,
          address: setting?.businessAddress ?? null,
          email: setting?.businessEmail ?? null,
        },
        client: {
          name: client.name,
          company: client.company,
          address: client.address,
        },
        lineItems: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      },
    })
  );

  try {
    await sendInvoiceEmail({
      to,
      cc,
      subject,
      body,
      pdfBuffer: Buffer.from(buffer),
      pdfFilename: `invoice-${invoice.number}.pdf`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await db.update(invoices).set({ status: "sent" }).where(eq(invoices.id, invoiceId));
  return NextResponse.json({ ok: true });
}
