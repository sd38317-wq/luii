import { NextRequest, NextResponse } from "next/server";
import { parseReservationImage } from "@/lib/reservationParser";

const SUPPORTED_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body?.image || typeof body.image !== "string") {
    return NextResponse.json({ error: "이미지 데이터가 없습니다." }, { status: 400 });
  }

  const mediaType = SUPPORTED_MEDIA_TYPES.includes(body.mediaType) ? body.mediaType : "image/png";

  const result = await parseReservationImage(body.image, mediaType);

  if (!result.success || !result.data) {
    return NextResponse.json({ error: result.error ?? "처리에 실패했습니다." }, { status: 502 });
  }

  return NextResponse.json(result.data);
}
