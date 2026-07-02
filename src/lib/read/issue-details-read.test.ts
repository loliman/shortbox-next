import { readIssueDetailStories } from "./issue-details-read";
import { isSameIssue } from "../../components/details/issue-details/utils/storyIssueUtils";

// Mock server-only before anything else
jest.mock("server-only", () => ({}));

describe("readIssueDetailStories - Reprint Group Integration Test", () => {
  it("should retrieve reprint-aware children for Journey Into Mystery #18 Story 1", async () => {
    // Journey Into Mystery #18 has ID 39081
    const stories = await readIssueDetailStories({
      selectedIssueId: 39081,
      storyOwnerId: 39081,
    });

    expect(stories.length).toBeGreaterThan(0);

    // Story 1 should be "The Man Who Went Back!"
    const story1 = stories.find((s) => s.number === 1);
    expect(story1).toBeDefined();
    expect(story1?.title).toBe("The Man Who Went Back!");

    // It should have at least 1 child (Werewolf by Night Classic Collection #1)
    expect(story1?.children).toBeDefined();
    expect(story1?.children?.length).toBe(1);

    const child = story1?.children?.[0];
    expect(child?.issue?.series?.title).toContain("Werewolf by Night Classic Collection");
    expect(child?.issue?.number).toBe("1");

    // The child should link to its parent (Giant-Size Werewolf #3)
    expect(child?.parent).toBeDefined();
    expect(child?.parent?.number).toBe(3); // Story 3
    expect(child?.parent?.issue?.storiesCount).toBe(5); // Giant-Size Werewolf #3 has 5 stories

    // Debug parentLink logic
    const currentIssue = story1?.issue;
    console.log("DEBUG - child.parent.issue:", JSON.stringify(child?.parent?.issue, null, 2));
    console.log("DEBUG - currentIssue:", JSON.stringify(currentIssue, null, 2));
    console.log("DEBUG - isSameIssue result:", isSameIssue(child?.parent?.issue, currentIssue));
  });
});
