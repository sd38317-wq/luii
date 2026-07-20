import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/phone";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.customerName !== undefined) data.customerName = String(body.customerName).trim();
  if (body.phone !== undefined) {
    const normalizedPhone = normalizePhone(String(body.phone));
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "휴대폰 번호 형식이 올바르지 않습니다. (예: 010-1234-5678)" },
        { status: 400 },
      );
    }
    data.phone = normalizedPhone;
  }
  if (body.memo !== undefined) data.memo = body.memo ? String(body.memo).trim() : null;
  if (body.partySize !== undefined) {
    data.partySize = body.partySize ? Number(body.partySize) : null;
  }
  if (body.reservationTime !== undefined) {
    const t = new Date(body.reservationTime);
    if (Number.isNaN(t.getTime())) {
      return NextResponse.json({ error: "예약시간 형식이 올바르지 않습니다." }, { status: 400 });
    }
    data.reservationTime = t;
    // Changing the time re-arms the reminder so it can be sent again for the new slot.
    data.reminderSentAt = null;
  }
  if (body.status !== undefined) {
    if (body.status !== "PENDING" && body.status !== "CANCELLED") {
      return NextResponse.json({ error: "status 값이 올바르지 않습니다." }, { status: 400 });
    }
    data.status = body.status;
  }

  try {
    const reservation = await prisma.reservation.update({ where: { id }, data });
    return NextResponse.json(reservation);
  } catch {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.reservation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  }
}
