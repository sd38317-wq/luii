import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionValue } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtectedPage = pathname.startsWith("/admin");
  const isProtectedApi = pathname.startsWith("/api/reservations");

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const valid = await isValidSessionValue(cookie);

  if (valid) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/reservations/:path*"],
};
