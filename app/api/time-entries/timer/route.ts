import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { desc, isNull } from "drizzle-orm";

export async function GET() {
  const [running] = await db
    .select()
    .from(timeEntries)
    .where(isNull(timeEntries.endedAt))
    .orderBy(desc(timeEntries.startedAt))
    .limit(1);
  return NextResponse.json(running ?? null);
}

export async function POST(req: Request) {
  const { clientId, notes } = await req.json();
  if (!clientId) return NextResponse.json({ error: "clientId required" }, { status: 400 });

  await db.update(timeEntries).set({ endedAt: new Date() }).where(isNull(timeEntries.endedAt));

  const [entry] = await db
    .insert(timeEntries)
    .values({ clientId: Number(clientId), startedAt: new Date(), notes: notes ?? null })
    .returning();
  return NextResponse.json(entry);
}

export async function DELETE() {
  await db.update(timeEntries).set({ endedAt: new Date() }).where(isNull(timeEntries.endedAt));
  return NextResponse.json({ ok: true });
}
