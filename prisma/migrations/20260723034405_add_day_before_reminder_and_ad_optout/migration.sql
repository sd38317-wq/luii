-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "dayBeforeReminderSentAt" DATETIME;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "adOptOutNumber" TEXT;
