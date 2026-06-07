import { prisma } from "../src/lib/prisma/client";

async function main() {
  const definitions = await prisma.$queryRaw<Array<{
    conname: string;
    condef: string;
  }>>`
    SELECT c.conname, pg_get_constraintdef(c.oid) as condef
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'shortbox' AND t.relname = 'variant';
  `;

  console.log("Variant constraints definitions:", definitions);
}

main().catch(console.error).finally(() => prisma.$disconnect());
