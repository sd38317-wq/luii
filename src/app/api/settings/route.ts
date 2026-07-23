import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return NextResponse.json(
    settings ?? {
      id: SETTINGS_ID,
      cafeName: null,
      address: null,
      parkingInfo: null,
      rules: null,
      checkoutDaysAfter: null,
      checkoutTime: null,
      reviewLink: null,
      giftEventContact: null,
      adOptOutNumber: null,
      checkoutNoticeTemplate: null,
      followUpTemplate: null,
    },
  );
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const rawDays = body.checkoutDaysAfter;
  const checkoutDaysAfter =
    rawDays === null || rawDays === undefined || rawDays === "" ? null : Number(rawDays);

  const data = {
    cafeName: body.cafeName?.trim() || null,
    address: body.address?.trim() || null,
    parkingInfo: body.parkingInfo?.trim() || null,
    rules: body.rules?.trim() || null,
    checkoutDaysAfter:
      checkoutDaysAfter !== null && Number.isFinite(checkoutDaysAfter) && checkoutDaysAfter >= 0
        ? checkoutDaysAfter
        : null,
    checkoutTime: /^\d{1,2}:\d{2}$/.test(body.checkoutTime?.trim() ?? "") ? body.checkoutTime.trim() : null,
    reviewLink: body.reviewLink?.trim() || null,
    giftEventContact: body.giftEventContact?.trim() || null,
    adOptOutNumber: body.adOptOutNumber?.trim() || null,
    checkoutNoticeTemplate: body.checkoutNoticeTemplate?.trim() || null,
    followUpTemplate: body.followUpTemplate?.trim() || null,
  };

  const settings = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  return NextResponse.json(settings);
}
