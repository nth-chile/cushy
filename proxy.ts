import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, authDisabled, type Session } from "./lib/auth";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_API = ["/api/auth/login"];

export async function proxy(req: NextRequest) {
  if (authDisabled) return NextResponse.next();

  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (PUBLIC_API.some((p) => pathname === p)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<Session>(req, res, sessionOptions);

  if (!session.loggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
