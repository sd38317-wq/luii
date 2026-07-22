import { prisma } from "./prisma";
import { sendSms, buildReminderMessage, buildFollowUpMessage } from "./sms";

const REMINDER_MINUTES = 30;
const GRACE_MINUTES = 5;

const DEFAULT_CHECKOUT_DAYS_AFTER = 1;
const DEFAULT_CHECKOUT_TIME = "11:59";

// 한국(Asia/Seoul)은 서머타임이 없는 고정 UTC+9라, 예약 시각을 한국 날짜로 환산한 뒤
// 그 날짜 기준으로 daysAfter일 뒤 timeStr 시각의 UTC 순간을 계산할 수 있다.
function computeCheckoutTime(reservationTime: Date, daysAfter: number, timeStr: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(reservationTime);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = Number(hourStr) || 0;
  const minute = Number(minuteStr) || 0;

  return new Date(
    Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day) + daysAfter, hour - 9, minute),
  );
}

export async function runReminderCheck(): Promise<number> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - GRACE_MINUTES * 60_000);
  const windowEnd = new Date(now.getTime() + REMINDER_MINUTES * 60_000);

  const due = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      reminderSentAt: null,
      reservationTime: { gte: windowStart, lte: windowEnd },
    },
  });

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  const cafeName = settings?.cafeName || process.env.CAFE_NAME || "키즈카페";
  const address = settings?.address || process.env.CAFE_ADDRESS || null;
  const parkingInfo = settings?.parkingInfo || process.env.CAFE_PARKING_INFO || null;
  const rules = settings?.rules || process.env.CAFE_RULES || null;

  for (const reservation of due) {
    const message = buildReminderMessage({
      cafeName,
      customerName: reservation.customerName,
      reservationTime: reservation.reservationTime,
      partySize: reservation.partySize,
      address,
      parkingInfo,
      rules,
    });

    const result = await sendSms(reservation.phone, message, `[${cafeName}] 예약 안내`);

    if (result.success) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { reminderSentAt: new Date() },
      });
      console.log(`[reminder] sent to ${reservation.customerName} (${reservation.phone})`);
    } else {
      console.error(
        `[reminder] failed for ${reservation.customerName} (${reservation.phone}): ${result.error}`,
      );
    }
  }

  return due.length;
}

export async function runFollowUpCheck(): Promise<number> {
  const now = new Date();

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const cafeName = settings?.cafeName || process.env.CAFE_NAME || "키즈카페";
  const reviewLink = settings?.reviewLink || null;
  const giftEventContact = settings?.giftEventContact || null;
  const checkoutDaysAfter = settings?.checkoutDaysAfter ?? DEFAULT_CHECKOUT_DAYS_AFTER;
  const checkoutTime = settings?.checkoutTime || DEFAULT_CHECKOUT_TIME;

  const candidates = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      followUpSentAt: null,
      reservationTime: { lte: now },
    },
  });

  let sentCount = 0;

  for (const reservation of candidates) {
    const checkoutAt = computeCheckoutTime(reservation.reservationTime, checkoutDaysAfter, checkoutTime);
    if (checkoutAt > now) continue;

    const message = buildFollowUpMessage({
      cafeName,
      customerName: reservation.customerName,
      reviewLink,
      giftEventContact,
    });

    const result = await sendSms(reservation.phone, message, `[${cafeName}] 이용 안내`);

    if (result.success) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { followUpSentAt: new Date() },
      });
      sentCount++;
      console.log(`[followup] sent to ${reservation.customerName} (${reservation.phone})`);
    } else {
      console.error(
        `[followup] failed for ${reservation.customerName} (${reservation.phone}): ${result.error}`,
      );
    }
  }

  return sentCount;
}
