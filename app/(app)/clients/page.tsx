import Link from "next/link";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";

export default async function ClientsPage() {
  const rows = await db.select().from(clients).orderBy(clients.name);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Link href="/clients/new" className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white dark:bg-zinc-50 dark:text-zinc-900">
          New client
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">No clients yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/clients/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <div>
                  <div className="font-medium">{c.name}</div>
                  {c.company && <div className="text-sm text-zinc-500">{c.company}</div>}
                </div>
                {c.hourlyRate && <div className="text-sm text-zinc-500">${c.hourlyRate}/hr</div>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
