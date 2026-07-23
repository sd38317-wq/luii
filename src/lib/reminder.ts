import { prisma } from "./prisma";
import {
  sendSms,
  buildDayBeforeReminderMessage,
  buildReminderMessage,
  buildFollowUpMessage,
  buildCheckoutNoticeMessage,
} from "./sms";
import { sendFailureAlert } from "./alert";

const REMINDER_MINUTES = 30;
const GRACE_MINUTES = 5;

const DEFAULT_CHECKOUT_DAYS_AFTER = 1;
const DEFAULT_CHECKOUT_TIME = "11:59";

const CHECKOUT_NOTICE_LEAD_MINUTES = 10; // 퇴실(departureTime) 10분 전
const CHECKOUT_NOTICE_FALLBACK_DELAY_MINUTES = 60; // 퇴실 시간을 안 적었을 때 대체값: 예약 시작 시각 + 1시간

// 발송 시점이 이만큼 지나버린 예약(기록용으로 등록한 과거 예약 등)은 고객에게
// 뒤늦은 문자가 가지 않도록 발송을 건너뛰고, 발송 완료로 도장만 찍어둔다.
const MAX_LATE_MS = 48 * 60 * 60_000;

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

// 노쇼 방지에는 당일 30분 전 문자보다 전날 저녁 문자가 더 효과적이라(업계 권장: 전날 17~20시),
// 예약 전날 20시에 미리 한 번 안내를 보낸다. 광고성 문자 야간 제한(21시~)에도 걸리지 않는 시각이다.
const DAY_BEFORE_REMINDER_TIME = "20:00";

export async function runDayBeforeReminderCheck(): Promise<number> {
  const now = new Date();

  const candidates = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      dayBeforeReminderSentAt: null,
      reservationTime: { gt: now },
    },
  });

  if (candidates.length === 0) return 0;

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const cafeName = settings?.cafeName || process.env.CAFE_NAME || "키즈카페";
  const address = settings?.address || process.env.CAFE_ADDRESS || null;
  const parkingInfo = settings?.parkingInfo || process.env.CAFE_PARKING_INFO || null;
  const rules = settings?.rules || process.env.CAFE_RULES || null;

  let sentCount = 0;

  for (const reservation of candidates) {
    const triggerAt = computeCheckoutTime(reservation.reservationTime, -1, DAY_BEFORE_REMINDER_TIME);
    if (triggerAt > now) continue;

    // 예약 당일(한국 시각 자정 이후)에 뒤늦게 등록된 예약은 "내일 예약" 문자가 오히려
    // 혼란을 주므로 보내지 않고 도장만 찍는다. 당일 30분 전 문자가 어차피 나간다.
    const reservationDayStart = computeCheckoutTime(reservation.reservationTime, 0, "00:00");
    if (now >= reservationDayStart) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { dayBeforeReminderSentAt: new Date() },
      });
      console.log(
        `[day-before] skipped (same-day booking) for ${reservation.customerName} (${reservation.phone})`,
      );
      continue;
    }

    const message = buildDayBeforeReminderMessage({
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
        data: { dayBeforeReminderSentAt: new Date() },
      });
      sentCount++;
      console.log(`[day-before] sent to ${reservation.customerName} (${reservation.phone})`);
    } else {
      console.error(
        `[day-before] failed for ${reservation.customerName} (${reservation.phone}): ${result.error}`,
      );
      await sendFailureAlert(
        "[예약 전날 안내 문자 발송 실패]",
        `${reservation.customerName}(${reservation.phone})님에게 예약 전날 안내 문자 발송이 실패했어요.\n\n오류: ${result.error}\n\n관리자 페이지에서 확인해주세요.`,
      );
    }
  }

  return sentCount;
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
      await sendFailureAlert(
        "[예약 안내 문자 발송 실패]",
        `${reservation.customerName}(${reservation.phone})님에게 예약 안내 문자 발송이 실패했어요.\n\n오류: ${result.error}\n\n관리자 페이지에서 확인해주세요.`,
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
  const adOptOutNumber = settings?.adOptOutNumber || null;
  const followUpTemplate = settings?.followUpTemplate || null;
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

    if (now.getTime() - checkoutAt.getTime() > MAX_LATE_MS) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { followUpSentAt: new Date() },
      });
      console.log(
        `[followup] skipped (48h past due) for ${reservation.customerName} (${reservation.phone})`,
      );
      continue;
    }

    const message = buildFollowUpMessage({
      cafeName,
      customerName: reservation.customerName,
      reviewLink,
      giftEventContact,
      template: followUpTemplate,
      adOptOutNumber,
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
      await sendFailureAlert(
        "[리뷰 요청 문자 발송 실패]",
        `${reservation.customerName}(${reservation.phone})님에게 리뷰 요청 문자 발송이 실패했어요.\n\n오류: ${result.error}\n\n관리자 페이지에서 확인해주세요.`,
      );
    }
  }

  return sentCount;
}

export async function runCheckoutNoticeCheck(): Promise<number> {
  const now = new Date();

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const cafeName = settings?.cafeName || process.env.CAFE_NAME || "키즈카페";
  const giftEventContact = settings?.giftEventContact || null;
  const adOptOutNumber = settings?.adOptOutNumber || null;
  const checkoutNoticeTemplate = settings?.checkoutNoticeTemplate || null;

  const candidates = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      checkoutNoticeSentAt: null,
      reservationTime: { lte: now },
    },
  });

  let sentCount = 0;

  for (const reservation of candidates) {
    const triggerAt = reservation.departureTime
      ? new Date(reservation.departureTime.getTime() - CHECKOUT_NOTICE_LEAD_MINUTES * 60_000)
      : new Date(
          reservation.reservationTime.getTime() + CHECKOUT_NOTICE_FALLBACK_DELAY_MINUTES * 60_000,
        );
    if (triggerAt > now) continue;

    if (now.getTime() - triggerAt.getTime() > MAX_LATE_MS) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { checkoutNoticeSentAt: new Date() },
      });
      console.log(
        `[checkout-notice] skipped (48h past due) for ${reservation.customerName} (${reservation.phone})`,
      );
      continue;
    }

    const message = buildCheckoutNoticeMessage({
      cafeName,
      customerName: reservation.customerName,
      giftEventContact,
      template: checkoutNoticeTemplate,
      adOptOutNumber,
    });

    const result = await sendSms(reservation.phone, message, `[${cafeName}] 이용 안내`);

    if (result.success) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { checkoutNoticeSentAt: new Date() },
      });
      sentCount++;
      console.log(`[checkout-notice] sent to ${reservation.customerName} (${reservation.phone})`);
    } else {
      console.error(
        `[checkout-notice] failed for ${reservation.customerName} (${reservation.phone}): ${result.error}`,
      );
      await sendFailureAlert(
        "[퇴실 안내 문자 발송 실패]",
        `${reservation.customerName}(${reservation.phone})님에게 퇴실 안내 문자 발송이 실패했어요.\n\n오류: ${result.error}\n\n관리자 페이지에서 확인해주세요.`,
      );
    }
  }

  return sentCount;
}
