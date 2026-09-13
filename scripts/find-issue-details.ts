import { prisma } from "../src/lib/prisma/client";

async function main() {
  const issues = await prisma.issue.findMany({
    where: {
      number: "2",
      series: {
        title: {
          contains: "Avengers",
          mode: "insensitive"
        }
      }
    },
    include: {
      series: {
        include: {
          publisher: true
        }
      },
      variants: true
    }
  });

  console.log(`Found ${issues.length} issue(s) matching number 2:`);
  for (const issue of issues) {
    if (issue.series?.title?.includes("Collection")) {
      console.log({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        series: {
          id: issue.series.id,
          title: issue.series.title,
          volume: Number(issue.series.volume),
          startYear: Number(issue.series.startYear),
          publisher: issue.series.publisher?.name,
          original: issue.series.publisher?.original,
        },
        variants: issue.variants.map(v => ({
          id: v.id,
          format: v.format,
          variantLabel: v.variantLabel,
        }))
      });
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
