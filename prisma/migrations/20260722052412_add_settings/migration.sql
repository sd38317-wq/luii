-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "cafeName" TEXT,
    "address" TEXT,
    "parkingInfo" TEXT,
    "rules" TEXT,
    "updatedAt" DATETIME NOT NULL
);
