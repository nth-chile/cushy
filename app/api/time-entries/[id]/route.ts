import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const update: Partial<typeof timeEntries.$inferInsert> = {};
  if (body.clientId !== undefined) update.clientId = Number(body.clientId);
  if (body.startedAt !== undefined) update.startedAt = new Date(body.startedAt);
  if (body.endedAt !== undefined) update.endedAt = body.endedAt ? new Date(body.endedAt) : null;
  if (body.notes !== undefined) update.notes = body.notes;

  const [entry] = await db.update(timeEntries).set(update).where(eq(timeEntries.id, Number(id))).returning();
  return NextResponse.json(entry);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(timeEntries).where(eq(timeEntries.id, Number(id)));
  return NextResponse.json({ ok: true });
}
