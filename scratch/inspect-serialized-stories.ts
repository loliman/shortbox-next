import { readIssueDetailStories } from "../src/lib/read/issue-details-read";

async function main() {
  const stories = await readIssueDetailStories({
    selectedIssueId: "49054"
  });

  console.log("Serialized stories returned to client:");
  for (const s of stories) {
    console.log(`- Title: ${s.title}`);
    console.log(`  collected: ${s.collected}`);
    console.log(`  collectedmultipletimes: ${s.collectedmultipletimes}`);
    if (s.parent) {
      console.log(`  parent.title: ${s.parent.title}`);
      console.log(`  parent.collected: ${s.parent.collected}`);
      console.log(`  parent.collectedmultipletimes: ${s.parent.collectedmultipletimes}`);
    } else {
      console.log(`  parent: null`);
    }
  }
}

main().catch(console.error);
