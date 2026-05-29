import { db } from "@/lib/db";
import { invoices, invoiceLineItems, clients, contacts, settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import InvoiceView from "./invoice-view";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoiceId = Number(id);
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
  if (!invoice) notFound();

  const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
  const clientContacts = await db.select().from(contacts).where(eq(contacts.clientId, invoice.clientId));
  const items = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId))
    .orderBy(invoiceLineItems.position);
  const [setting] = await db.select().from(settings).where(eq(settings.id, 1));

  return (
    <InvoiceView
      invoice={invoice}
      client={{ ...client, contacts: clientContacts }}
      lineItems={items}
      businessName={setting?.businessName ?? ""}
    />
  );
}
