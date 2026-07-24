import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function GET() {
  const reservations = await prisma.reservation.findMany({
    orderBy: { reservationTime: "asc" },
  });
  return NextResponse.json(reservations);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const customerName = body?.customerName?.trim();
  const phone = body?.phone?.trim();
  const reservationTimeRaw = body?.reservationTime;
  const departureTimeRaw = body?.departureTime;
  const partySize = body?.partySize ? Number(body.partySize) : null;
  const memo = body?.memo?.trim() || null;

  if (!customerName || !phone || !reservationTimeRaw) {
    return NextResponse.json(
      { error: "고객명, 연락처, 예약시간은 필수입니다." },
      { status: 400 },
    );
  }

  const reservationTime = new Date(reservationTimeRaw);
  if (Number.isNaN(reservationTime.getTime())) {
    return NextResponse.json({ error: "예약시간 형식이 올바르지 않습니다." }, { status: 400 });
  }

  let departureTime: Date | null = null;
  if (departureTimeRaw) {
    departureTime = new Date(departureTimeRaw);
    if (Number.isNaN(departureTime.getTime())) {
      return NextResponse.json({ error: "퇴실시간 형식이 올바르지 않습니다." }, { status: 400 });
    }
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return NextResponse.json(
      { error: "휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" },
      { status: 400 },
    );
  }

  // 같은 번호로 같은 시각 예약이 이미 있으면 중복 등록으로 본다. 캡처 사진을 실수로
  // 같은 걸 두 번 올리거나(사진 여러 장 일괄 등록 시), 수동으로 같은 예약을 중복 입력하는
  // 걸 막기 위한 안전장치다. 취소된 예약은 중복 판정에서 제외한다.
  const duplicate = await prisma.reservation.findFirst({
    where: { phone: normalizedPhone, reservationTime, status: "PENDING" },
  });
  if (duplicate) {
    return NextResponse.json(
      {
        error: `이미 같은 시간에 등록된 예약이 있어요 (${duplicate.customerName}, ${normalizedPhone}). 중복 등록을 막기 위해 저장하지 않았어요.`,
      },
      { status: 409 },
    );
  }

  const reservation = await prisma.reservation.create({
    data: {
      customerName,
      phone: normalizedPhone,
      reservationTime,
      departureTime,
      partySize: partySize && !Number.isNaN(partySize) ? partySize : null,
      memo,
    },
  });

  return NextResponse.json(reservation, { status: 201 });
}
