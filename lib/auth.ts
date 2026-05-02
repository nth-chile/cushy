import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type Session = {
  loggedIn?: boolean;
};

const sessionPassword = process.env.SESSION_SECRET;
if (!sessionPassword || sessionPassword.length < 32) {
  if (process.env.NODE_ENV !== "production") {
    console.warn("SESSION_SECRET should be at least 32 chars. Using insecure dev fallback.");
  }
}

export const sessionOptions: SessionOptions = {
  password: sessionPassword || "dev-only-insecure-secret-change-me-now-please",
  cookieName: "cushy_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  },
};

export async function getSession() {
  return getIronSession<Session>(await cookies(), sessionOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.loggedIn) throw new Error("UNAUTHORIZED");
  return session;
}

export function checkPassword(input: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD not set");
  return input === expected;
}
