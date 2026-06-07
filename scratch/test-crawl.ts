import { prisma } from "../src/lib/prisma/client";
import { editIssue } from "../src/lib/server/issues-write";

async function main() {
  // Find the issue and its variant
  const issue = await prisma.issue.findFirst({
    where: {
      number: "29",
      series: {
        title: "Spider-Man",
        volume: 4,
      },
    },
    include: {
      variants: true,
      series: {
        include: {
          publisher: true,
        },
      },
    },
  });

  if (!issue) {
    console.error("Issue not found!");
    return;
  }

  const variant = issue.variants[0];
  if (!variant) {
    console.error("Variant not found!");
    return;
  }

  console.log("Calling editIssue...");
  const result = await editIssue({
    id: Number(issue.id),
    variantId: Number(variant.id),
    title: issue.title || "",
    number: issue.number,
    legacy_number: issue.legacyNumber || "",
    format: variant.format,
    variant: variant.variantLabel || "",
    releasedate: variant.releaseDate ? variant.releaseDate.toISOString().split("T")[0] : "",
    pages: Number(variant.pages || 0),
    price: variant.price ? Number(variant.price) : null,
    currency: variant.currency || "",
    comicguideid: variant.comicGuideId ? Number(variant.comicGuideId) : null,
    isbn: variant.isbn || "",
    limitation: variant.limitation ? Number(variant.limitation) : null,
    addinfo: variant.addInfo || "",
    verified: variant.verified,
    collected: variant.collected || false,
    series: {
      title: issue.series!.title || "",
      volume: Number(issue.series!.volume),
      publisher: {
        name: issue.series!.publisher!.name,
        us: issue.series!.publisher!.original,
      },
    },
    stories: [
      {
        number: 1,
        title: "Go Down Swinging Part One",
        parent: {
          number: "29",
          issue: {
            number: "29",
            series: {
              title: "Amazing Spider-Man",
              volume: 4,
            },
          },
        },
      },
    ],
  });

  console.log("Result:", result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
