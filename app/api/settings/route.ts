import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return NextResponse.json(row ?? null);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const values = {
    id: 1 as const,
    businessName: body.businessName ?? null,
    businessEmail: body.businessEmail ?? null,
    invoiceNumberStart: Number(body.invoiceNumberStart ?? 1000),
    gmailUser: body.gmailUser ?? null,
  };
  const [row] = await db
    .insert(settings)
    .values(values)
    .onConflictDoUpdate({ target: settings.id, set: values })
    .returning();
  return NextResponse.json(row);
}
