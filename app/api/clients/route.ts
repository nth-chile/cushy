import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clients, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(clients).orderBy(clients.name);
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, company, address, notes, hourlyRate, emailSubjectTemplate, emailBodyTemplate, contacts: contactList } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const [client] = await db
    .insert(clients)
    .values({ name, company, address, notes, hourlyRate, emailSubjectTemplate, emailBodyTemplate })
    .returning();

  if (Array.isArray(contactList) && contactList.length) {
    await db.insert(contacts).values(
      contactList
        .filter((c: { name?: string; email?: string }) => c.name && c.email)
        .map((c: { name: string; email: string; isPrimary?: boolean }) => ({
          clientId: client.id,
          name: c.name,
          email: c.email,
          isPrimary: !!c.isPrimary,
        }))
    );
  }

  return NextResponse.json(client);
}
