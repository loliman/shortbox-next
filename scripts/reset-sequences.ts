import { prisma } from "../src/lib/prisma/client";

async function main() {
  const tables = [
    "publisher",
    "series",
    "issue",
    "variant"
  ];

  for (const table of tables) {
    try {
      const seqName = `shortbox.${table}_id_seq`;
      
      // Check max ID in the table
      const maxIdResult = await prisma.$queryRawUnsafe<{ max_id: string | number | bigint | null }[]>(
        `SELECT MAX(id) as max_id FROM shortbox.${table};`
      );
      
      const maxId = maxIdResult[0]?.max_id;
      const nextVal = maxId ? Number(maxId) : 1;
      
      // Reset the sequence
      await prisma.$queryRawUnsafe(
        `SELECT setval('${seqName}', ${nextVal}, true);`
      );
      console.log(`Successfully reset sequence for table ${table} to ${nextVal}`);
    } catch (error) {
      console.error(`Failed to reset sequence for table ${table}:`, error);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
