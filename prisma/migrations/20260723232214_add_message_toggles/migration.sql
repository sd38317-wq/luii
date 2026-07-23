-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "cafeName" TEXT,
    "address" TEXT,
    "parkingInfo" TEXT,
    "rules" TEXT,
    "checkoutDaysAfter" INTEGER,
    "checkoutTime" TEXT,
    "reviewLink" TEXT,
    "giftEventContact" TEXT,
    "adOptOutNumber" TEXT,
    "sendDayBefore" BOOLEAN NOT NULL DEFAULT true,
    "sendReminder" BOOLEAN NOT NULL DEFAULT true,
    "sendCheckoutNotice" BOOLEAN NOT NULL DEFAULT true,
    "sendFollowUp" BOOLEAN NOT NULL DEFAULT true,
    "checkoutNoticeTemplate" TEXT,
    "followUpTemplate" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("adOptOutNumber", "address", "cafeName", "checkoutDaysAfter", "checkoutNoticeTemplate", "checkoutTime", "followUpTemplate", "giftEventContact", "id", "parkingInfo", "reviewLink", "rules", "updatedAt") SELECT "adOptOutNumber", "address", "cafeName", "checkoutDaysAfter", "checkoutNoticeTemplate", "checkoutTime", "followUpTemplate", "giftEventContact", "id", "parkingInfo", "reviewLink", "rules", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
