import { prisma } from "../src/lib/prisma/client";
import { readIssueDetails } from "../src/lib/read/issue-details-read";

async function main() {
  const selection = {
    us: false,
    publisher: "panini-marvel-icon",
    series: "avengers-collection",
    volume: 1,
    startyear: 2019,
    number: "2",
    format: "hardcover",
  };

  console.log("Reading issue details for Avengers Collection #2:");
  const details = await readIssueDetails(selection);
  if (!details) {
    console.log("No details found!");
    return;
  }

  console.log("\nIssue info:", {
    id: details.id,
    title: details.title,
    number: details.number,
    format: details.format,
    variant: details.variant,
  });

  console.log("\nStories count:", details.stories.length);
  for (const story of details.stories) {
    console.log(`\nStory ID: ${story.id}, Title: "${story.title}", Part: "${story.part}"`);
    if (story.parent) {
      console.log("  Parent:", {
        id: story.parent.id,
        title: story.parent.title,
        issue: story.parent.issue ? {
          id: story.parent.issue.id,
          title: story.parent.issue.title,
          number: story.parent.issue.number,
          format: story.parent.issue.format,
          variant: story.parent.issue.variant,
        } : null,
      });
    }
    if (story.reprintOf) {
      console.log("  ReprintOf:", {
        id: story.reprintOf.id,
        title: story.reprintOf.title,
        issue: story.reprintOf.issue ? {
          id: story.reprintOf.issue.id,
          title: story.reprintOf.issue.title,
          number: story.reprintOf.issue.number,
          format: story.reprintOf.issue.format,
          variant: story.reprintOf.issue.variant,
        } : null,
      });
    }
    if (story.children && story.children.length > 0) {
      console.log("  Children:");
      for (const child of story.children) {
        console.log("    Child:", {
          id: child.id,
          title: child.title,
          issue: child.issue ? {
            id: child.issue.id,
            title: child.issue.title,
            number: child.issue.number,
            format: child.issue.format,
            variant: child.issue.variant,
          } : null,
          parent: child.parent ? {
            id: child.parent.id,
            title: child.parent.title,
            number: child.parent.number,
            format: child.parent.format,
            variant: child.parent.variant,
          } : null,
        });
      }
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
