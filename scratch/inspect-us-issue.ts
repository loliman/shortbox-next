import { prisma } from "../src/lib/prisma/client";

async function main() {
  const issue = await prisma.issue.findUnique({
    where: { id: 49054n },
    select: {
      id: true,
      number: true,
      title: true,
      notOwnedUsMaterial: true,
      noOwnedVariants: true,
      doubleCollected: true,
      doublePublisherCollected: true
    }
  });

  console.log("Issue flags:", issue);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
