import Link from "next/link";
import { db } from "@/lib/db";
import { clients, invoices, timeEntries } from "@/lib/db/schema";
import { eq, isNull, sql } from "drizzle-orm";

export default async function Dashboard() {
  const [clientCount] = await db.select({ count: sql<number>`count(*)::int` }).from(clients);
  const [openInvoices] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoices)
    .where(isNull(invoices.paidDate));
  const [runningTimer] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(timeEntries)
    .where(isNull(timeEntries.endedAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/clients" className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700">
          <div className="text-sm text-zinc-500">Clients</div>
          <div className="text-2xl font-semibold">{clientCount?.count ?? 0}</div>
        </Link>
        <Link href="/invoices" className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700">
          <div className="text-sm text-zinc-500">Open invoices</div>
          <div className="text-2xl font-semibold">{openInvoices?.count ?? 0}</div>
        </Link>
        <Link href="/time" className="rounded-lg border border-zinc-200 p-4 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700">
          <div className="text-sm text-zinc-500">Running timer</div>
          <div className="text-2xl font-semibold">{runningTimer?.count ? "On" : "—"}</div>
        </Link>
      </div>
    </div>
  );
}
