import { prisma } from "../src/lib/prisma/client";

async function main() {
  const parentId = 35686n;

  const stories = await prisma.story.findMany({
    where: {
      OR: [
        { id: parentId },
        { fkParent: parentId }
      ]
    },
    include: {
      issue: {
        include: {
          series: {
            include: { publisher: true }
          },
          variants: true
        }
      }
    }
  });

  console.log(`Stories for parent ${parentId.toString()}:`);
  for (const s of stories) {
    console.log(`- Story ID: ${s.id.toString()}, Title: ${s.title}, Issue ID: ${s.issue?.id.toString()}, Issue: ${s.issue?.series?.title} #${s.issue?.number} (${s.issue?.series?.publisher?.name})`);
    console.log("  Variants:");
    for (const v of s.issue?.variants ?? []) {
      console.log(`    * Variant ID: ${v.id.toString()}, Format: ${v.format}, Label: ${v.variantLabel}, Collected: ${v.collected}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
