import { PrismaClient } from "@prisma/client";

declare global {
  var __shortboxPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__shortboxPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__shortboxPrisma__ = prisma;
}
