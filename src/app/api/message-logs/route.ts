import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const LOG_LIMIT = 50;

// 한국(UTC+9) 기준 이번 달 1일 0시의 UTC 순간.
function startOfMonthKst(now: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return new Date(Date.UTC(Number(map.year), Number(map.month) - 1, 1, -9, 0));
}

export async function GET() {
  const now = new Date();
  const monthStart = startOfMonthKst(now);

  const [logs, sentThisMonth, failedThisMonth, reservationsThisMonth] = await Promise.all([
    prisma.messageLog.findMany({ orderBy: { createdAt: "desc" }, take: LOG_LIMIT }),
    prisma.messageLog.count({ where: { success: true, createdAt: { gte: monthStart } } }),
    prisma.messageLog.count({ where: { success: false, createdAt: { gte: monthStart } } }),
    prisma.reservation.count({ where: { reservationTime: { gte: monthStart } } }),
  ]);

  return NextResponse.json({
    logs,
    stats: {
      monthLabel: new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "long",
      }).format(now),
      reservations: reservationsThisMonth,
      sent: sentThisMonth,
      failed: failedThisMonth,
    },
  });
}
