import Link from "next/link";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, clients } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { buttonVariants } from "@heroui/react";
import { InvoiceList } from "./invoice-list";

export default async function InvoicesPage() {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Link href="/invoices/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
          New invoice
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-default-500 text-sm">No invoices yet.</p>
      ) : (
        <InvoiceList rows={rows} />
      )}
    </div>
  );
}
