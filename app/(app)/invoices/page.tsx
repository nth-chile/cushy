import Link from "next/link";
import { db } from "@/lib/db";
import { invoices, invoiceLineItems, clients } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { formatMoney } from "@/lib/invoice";

export default async function InvoicesPage() {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      clientName: clients.name,
      issuedDate: invoices.issuedDate,
      dueDate: invoices.dueDate,
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
        <Link href="/invoices/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900">
          New invoice
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No invoices yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map((inv) => (
            <li key={inv.id}>
              <Link href={`/invoices/${inv.id}`} className="grid grid-cols-12 items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <div className="col-span-2 font-mono text-sm">#{inv.number}</div>
                <div className="col-span-4 truncate">{inv.clientName}</div>
                <div className="col-span-2 text-sm text-zinc-500">{inv.issuedDate}</div>
                <div className="col-span-2 text-sm text-right">{formatMoney(Number(inv.total))}</div>
                <div className="col-span-2 text-sm text-right">
                  <StatusBadge status={inv.paidDate ? "paid" : inv.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  };
  return <span className={`rounded px-2 py-0.5 text-xs ${colors[status] ?? colors.draft}`}>{status}</span>;
}
