-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "departureTime" DATETIME;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "checkoutNoticeTemplate" TEXT;
ALTER TABLE "Settings" ADD COLUMN "followUpTemplate" TEXT;
