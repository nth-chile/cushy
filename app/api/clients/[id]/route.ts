import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) return NextResponse.json({ error: "not found" }, { status: 404 });
  const clientContacts = await db.select().from(contacts).where(eq(contacts.clientId, clientId));
  return NextResponse.json({ ...client, contacts: clientContacts });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clientId = Number(id);
  const body = await req.json();
  const { contacts: contactList, ...rest } = body;

  const [client] = await db
    .update(clients)
    .set({
      name: rest.name,
      company: rest.company,
      hourlyRate: rest.hourlyRate,
      emailSubjectTemplate: rest.emailSubjectTemplate,
      emailBodyTemplate: rest.emailBodyTemplate,
    })
    .where(eq(clients.id, clientId))
    .returning();

  if (Array.isArray(contactList)) {
    await db.delete(contacts).where(eq(contacts.clientId, clientId));
    if (contactList.length) {
      await db.insert(contacts).values(
        contactList
          .filter((c: { name?: string; email?: string }) => c.name && c.email)
          .map((c: { name: string; email: string; isPrimary?: boolean }) => ({
            clientId,
            name: c.name,
            email: c.email,
            isPrimary: !!c.isPrimary,
          }))
      );
    }
  }

  return NextResponse.json(client);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(clients).where(eq(clients.id, Number(id)));
  return NextResponse.json({ ok: true });
}
