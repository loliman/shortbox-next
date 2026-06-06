import { prisma } from "../src/lib/prisma/client";

async function main() {
  console.log("Checking tables with primary keys in shortbox schema:");
  const tables = await prisma.$queryRaw<any[]>`
    SELECT 
      tc.table_name, 
      tc.constraint_name, 
      tc.constraint_type
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'shortbox' 
      AND tc.constraint_type = 'PRIMARY KEY';
  `;
  console.log(tables);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
