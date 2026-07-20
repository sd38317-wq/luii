import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getExpectedSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "서버에 ADMIN_PASSWORD가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || password !== adminPassword) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = await getExpectedSessionToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
