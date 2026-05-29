import Link from "next/link";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { buttonVariants } from "@heroui/react";
import { ClientList } from "./client-list";

export default async function ClientsPage() {
  const rows = await db.select().from(clients).orderBy(clients.name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/clients/new" className={buttonVariants({ variant: "primary", size: "sm" })}>
          New client
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No clients yet.</p>
      ) : (
        <ClientList rows={rows} />
      )}
    </div>
  );
}
