import { db } from "@/lib/db";
import { clients, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ClientForm from "../client-form";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) notFound();
  const clientContacts = await db.select().from(contacts).where(eq(contacts.clientId, clientId));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{client.name}</h1>
      <ClientForm initial={{ ...client, contacts: clientContacts }} />
    </div>
  );
}
