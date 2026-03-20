import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

declare global {
  var __shortboxPrisma__: PrismaClient | undefined;
  var __shortboxPrismaPool__: Pool | undefined;
}

const prismaPool =
  globalThis.__shortboxPrismaPool__ ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const prismaAdapter = new PrismaPg(prismaPool);

export const prisma =
  globalThis.__shortboxPrisma__ ??
  new PrismaClient({
    adapter: prismaAdapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__shortboxPrisma__ = prisma;
  globalThis.__shortboxPrismaPool__ = prismaPool;
}
