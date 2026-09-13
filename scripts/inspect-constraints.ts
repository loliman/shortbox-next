/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../src/lib/prisma/client";

async function main() {
  console.log("Checking index/constraints for issue_arc and issue_individual:");
  
  const issueArcIndexes = await prisma.$queryRaw<any[]>`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'shortbox' AND tablename = 'issue_arc';
  `;
  console.log("\nIndexes on 'issue_arc':", issueArcIndexes);

  const issueArcConstraints = await prisma.$queryRaw<any[]>`
    SELECT conname, contype::text, pg_get_constraintdef(oid) as def
    FROM pg_constraint 
    WHERE conrelid = 'shortbox.issue_arc'::regclass;
  `;
  console.log("Constraints on 'issue_arc':", issueArcConstraints);

  const issueIndividualIndexes = await prisma.$queryRaw<any[]>`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'shortbox' AND tablename = 'issue_individual';
  `;
  console.log("\nIndexes on 'issue_individual':", issueIndividualIndexes);

  const issueIndividualConstraints = await prisma.$queryRaw<any[]>`
    SELECT conname, contype::text, pg_get_constraintdef(oid) as def
    FROM pg_constraint 
    WHERE conrelid = 'shortbox.issue_individual'::regclass;
  `;
  console.log("Constraints on 'issue_individual':", issueIndividualConstraints);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
