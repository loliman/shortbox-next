/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../src/lib/prisma/client";

async function main() {
  const tables = ['issue', 'series', 'publisher', 'story', 'cover', 'individual', 'arc'];
  console.log("Checking indexes containing 'id' for core tables:");
  
  for (const table of tables) {
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'shortbox' AND tablename = ${table};
    `;
    console.log(`\nTable: ${table}`);
    console.log(indexes);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
