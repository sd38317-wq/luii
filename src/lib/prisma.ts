import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const url = (process.env.DATABASE_URL ?? "file:./prisma/dev.db").replace(/^file:/, "");
const adapter = new PrismaBetterSqlite3({ url });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// WAL mode avoids the exclusive-lock fsync stalls of the default rollback journal,
// which can otherwise block the whole (single-threaded, synchronous-driver) process.
prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL;").catch((err) => {
  console.error("[prisma] failed to enable WAL mode:", err);
});
