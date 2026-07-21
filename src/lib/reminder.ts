import { prisma } from "./prisma";
import { sendSms, buildReminderMessage } from "./sms";

const REMINDER_MINUTES = 30;
const GRACE_MINUTES = 5;

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

  const cafeName = process.env.CAFE_NAME || "키즈카페";
  const address = process.env.CAFE_ADDRESS || null;
  const parkingInfo = process.env.CAFE_PARKING_INFO || null;
  const rules = process.env.CAFE_RULES || null;

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
