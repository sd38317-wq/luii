import { NextRequest, NextResponse } from "next/server";
import { parseReservationImage } from "@/lib/reservationParser";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.image || typeof body.image !== "string") {
    return NextResponse.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
  }

  const mediaType = typeof body.mediaType === "string" ? body.mediaType : undefined;
  const result = await parseReservationImage(body.image, mediaType);

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error ?? "처리에 실패했습니다." }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
