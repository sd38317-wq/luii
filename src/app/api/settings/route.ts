import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return NextResponse.json(
    settings ?? { id: SETTINGS_ID, cafeName: null, address: null, parkingInfo: null, rules: null },
  );
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const data = {
    cafeName: body.cafeName?.trim() || null,
    address: body.address?.trim() || null,
    parkingInfo: body.parkingInfo?.trim() || null,
    rules: body.rules?.trim() || null,
  };

  const settings = await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });

  return NextResponse.json(settings);
}
