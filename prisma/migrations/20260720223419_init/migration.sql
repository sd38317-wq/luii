-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reservationTime" DATETIME NOT NULL,
    "partySize" INTEGER,
    "memo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reminderSentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Reservation_reservationTime_idx" ON "Reservation"("reservationTime");
