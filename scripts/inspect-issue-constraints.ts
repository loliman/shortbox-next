/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../src/lib/prisma/client";

async function main() {
  console.log("Checking index/constraints for issue table:");
  
  const issueIndexes = await prisma.$queryRaw<any[]>`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'shortbox' AND tablename = 'issue';
  `;
  console.log("\nIndexes on 'issue':", issueIndexes);

  const issueConstraints = await prisma.$queryRaw<any[]>`
    SELECT conname, contype::text, pg_get_constraintdef(oid) as def
    FROM pg_constraint 
    WHERE conrelid = 'shortbox.issue'::regclass;
  `;
  console.log("Constraints on 'issue':", issueConstraints);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
