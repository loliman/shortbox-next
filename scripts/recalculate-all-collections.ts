import { prisma } from "../src/lib/prisma/client";
import { handleIssueWriteEffects } from "../src/lib/server/issue-materialize-write";

const BATCH_SIZE = 100;

async function main() {
  console.log("Fetching all DE issues...");
  const deIssues = await prisma.issue.findMany({
    where: {
      series: {
        publisher: {
          original: false,
        },
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${deIssues.length} DE issues. Recalculating collection flags in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < deIssues.length; i += BATCH_SIZE) {
    const batch = deIssues.slice(i, i + BATCH_SIZE);
    
    await prisma.$transaction(
      async (tx) => {
        for (const issue of batch) {
          await handleIssueWriteEffects(issue.id, tx);
        }
      },
      {
        timeout: 30000, // 30s timeout per batch
      }
    );

    console.log(`Processed ${Math.min(i + BATCH_SIZE, deIssues.length)}/${deIssues.length} issues.`);
  }

  console.log("Recalculation complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
