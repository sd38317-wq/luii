-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "followUpSentAt" DATETIME;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "checkoutDaysAfter" INTEGER;
ALTER TABLE "Settings" ADD COLUMN "checkoutTime" TEXT;
ALTER TABLE "Settings" ADD COLUMN "reviewLink" TEXT;
