import { NextResponse } from "next/server";
import { checkPassword, getSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!checkPassword(password)) {
    return NextResponse.json({ error: "wrong password" }, { status: 401 });
  }
  const session = await getSession();
  session.loggedIn = true;
  await session.save();
  return NextResponse.json({ ok: true });
}
