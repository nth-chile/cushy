import { db } from "@/lib/db";
import { invoices, invoiceLineItems, clients, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { InvoicePDF } from "@/lib/pdf/invoice";
import { renderToBuffer } from "@react-pdf/renderer";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) return new Response("not found", { status: 404 });

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

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${invoice.number}.pdf"`,
    },
  });
}
