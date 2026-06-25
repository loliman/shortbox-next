import { editIssue, createIssue } from "./issues-write";
import { prisma } from "../prisma/client";

describe("editIssue identity conflicts", () => {
  let publisherId: bigint;
  let seriesId: bigint;
  let issueId1: bigint;
  let issueId2: bigint;
  let variantId1: bigint;
  let variantId2: bigint;

  const publisherName = "Test Pub " + Math.random().toString(36).substring(7);
  const seriesTitle = "Test Series " + Math.random().toString(36).substring(7);

  beforeEach(async () => {
    // 1. Create Publisher
    const publisher = await prisma.publisher.create({
      data: {
        name: publisherName,
        original: false, // German publisher
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    publisherId = publisher.id;

    // 2. Create Series
    const series = await prisma.series.create({
      data: {
        title: seriesTitle,
        volume: 1n,
        startYear: 2026n,
        genre: "Sci-Fi",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: publisherId,
      },
    });
    seriesId = series.id;

    // 3. Create Issue 1 (with variant 1)
    const issue1 = await prisma.issue.create({
      data: {
        title: "Issue One",
        number: "1",
        fkSeries: seriesId,
        fkPublisher: publisherId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueId1 = issue1.id;

    const variant1 = await prisma.variant.create({
      data: {
        fkIssue: issueId1,
        format: "Heft",
        variantLabel: "A",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    variantId1 = variant1.id;

    // 4. Create Issue 2 (with variant 2)
    const issue2 = await prisma.issue.create({
      data: {
        title: "Issue Two",
        number: "2",
        fkSeries: seriesId,
        fkPublisher: publisherId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueId2 = issue2.id;

    const variant2 = await prisma.variant.create({
      data: {
        fkIssue: issueId2,
        format: "Heft",
        variantLabel: "B",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    variantId2 = variant2.id;
  });

  afterEach(async () => {
    // Clean up created records in reverse order
    await prisma.story.updateMany({
      where: { fkIssue: { in: [issueId1, issueId2] } },
      data: { fkParent: null, fkReprint: null },
    });
    await prisma.storyAppearance.deleteMany({
      where: { story: { fkIssue: { in: [issueId1, issueId2] } } },
    });
    await prisma.storyIndividual.deleteMany({
      where: { story: { fkIssue: { in: [issueId1, issueId2] } } },
    });
    await prisma.story.deleteMany({
      where: { fkIssue: { in: [issueId1, issueId2] } },
    });
    await prisma.variant.deleteMany({
      where: {
        fkIssue: {
          in: [issueId1, issueId2],
        },
      },
    });
    await prisma.issue.deleteMany({
      where: {
        id: {
          in: [issueId1, issueId2],
        },
      },
    });
    await prisma.series.delete({
      where: {
        id: seriesId,
      },
    });
    await prisma.publisher.delete({
      where: {
        id: publisherId,
      },
    });
  });

  it("should re-parent variant on conflict and delete empty original issue", async () => {
    // Call editIssue to update Issue 1's number to "2" and change format/label
    const result = await editIssue({
      id: Number(issueId1),
      variantId: Number(variantId1),
      title: "Issue Two Updated",
      number: "2",
      format: "Heft",
      variant: "A", // unique label
      series: {
        title: seriesTitle,
        volume: 1,
        publisher: {
          name: publisherName,
          us: false,
        },
      },
    });

    expect(result.success).toBe(true);

    // Verify Variant 1 has been re-parented to Issue 2
    const updatedVariant1 = await prisma.variant.findUnique({
      where: { id: variantId1 },
    });
    expect(updatedVariant1).not.toBeNull();
    expect(updatedVariant1!.fkIssue).toBe(issueId2);

    // Verify Issue 1 has been deleted because it has no variants left
    const deletedIssue = await prisma.issue.findUnique({
      where: { id: issueId1 },
    });
    expect(deletedIssue).toBeNull();

    // Verify Issue 2 now has 2 variants (A and B)
    const issue2Variants = await prisma.variant.findMany({
      where: { fkIssue: issueId2 },
    });
    expect(issue2Variants).toHaveLength(2);
    expect(issue2Variants.map(v => v.variantLabel)).toContain("A");
    expect(issue2Variants.map(v => v.variantLabel)).toContain("B");
  });

  it("should throw an error if the variant format/label already exists in target issue", async () => {
    // Call editIssue with conflicting format and label on target issue (format "Heft", label "B")
    const result = await editIssue({
      id: Number(issueId1),
      variantId: Number(variantId1),
      title: "Issue Two Updated",
      number: "2",
      format: "Heft",
      variant: "B", // Conflicts with existing B variant on Issue 2
      series: {
        title: seriesTitle,
        volume: 1,
        publisher: {
          name: publisherName,
          us: false,
        },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Variant already exists in target issue");
    }

    // Verify Variant 1 has NOT been re-parented
    const unchangedVariant1 = await prisma.variant.findUnique({
      where: { id: variantId1 },
    });
    expect(unchangedVariant1!.fkIssue).toBe(issueId1);

    // Verify Issue 1 still exists
    const issue1Exists = await prisma.issue.findUnique({
      where: { id: issueId1 },
    });
    expect(issue1Exists).not.toBeNull();
  });

  it("should edit an issue and update its stories successfully", async () => {
    // 1. Create a story on issueId1
    await prisma.story.create({
      data: {
        fkIssue: issueId1,
        number: 1n,
        part: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 2. Call editIssue to update the issue and its stories
    const result = await editIssue({
      id: Number(issueId1),
      variantId: Number(variantId1),
      title: "Issue One Updated",
      number: "1",
      format: "Heft",
      variant: "A",
      series: {
        title: seriesTitle,
        volume: 1,
        publisher: {
          name: publisherName,
          us: false,
        },
      },
      stories: [
        {
          number: 1,
          title: "First Story Updated",
        },
        {
          number: 2,
          title: "Second Story",
        },
      ],
    });

    expect(result.success).toBe(true);

    // Clean up created stories
    await prisma.story.deleteMany({
      where: { fkIssue: issueId1 },
    });
  });

  it("should fail to edit an issue if its stories are referenced as a reprint (unless handled)", async () => {
    // 1. Create Story A on issueId1
    const storyA = await prisma.story.create({
      data: {
        fkIssue: issueId1,
        number: 1n,
        part: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 2. Create Story B on issueId2, which is a reprint of Story A
    const storyB = await prisma.story.create({
      data: {
        fkIssue: issueId2,
        number: 1n,
        part: "",
        fkReprint: storyA.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 3. Edit issueId1 (which will delete and recreate Story A)
    const result = await editIssue({
      id: Number(issueId1),
      variantId: Number(variantId1),
      title: "Issue One Updated",
      number: "1",
      format: "Heft",
      variant: "A",
      series: {
        title: seriesTitle,
        volume: 1,
        publisher: {
          name: publisherName,
          us: false,
        },
      },
      stories: [
        {
          number: 1,
          title: "First Story Updated",
        },
      ],
    });

    // Clean up
    await prisma.story.deleteMany({
      where: { id: { in: [storyA.id, storyB.id] } },
    });

    // Expect edit to succeed (it should handle clearing the reprint link instead of failing!)
    expect(result.success).toBe(true);
  });

  it("should not delete existing stories when creating a new variant for an existing issue without stories", async () => {
    // 1. Create a parent issue with stories
    const resultIssue1 = await createIssue({
      title: "Story Test Issue",
      number: "42",
      format: "Heft",
      variant: "A",
      series: {
        title: seriesTitle,
        volume: 1,
        publisher: {
          name: publisherName,
          us: false,
        },
      },
      stories: [
        {
          number: 1,
          title: "My Original Story",
        },
      ],
    });

    expect(resultIssue1.success).toBe(true);
    if (!resultIssue1.success) throw new Error("Expected resultIssue1 to be successful");
    const parentId = BigInt(resultIssue1.data.item.id);

    // Verify story was created
    const originalStories = await prisma.story.findMany({
      where: { fkIssue: parentId },
    });
    expect(originalStories.length).toBe(1);
    expect(originalStories[0].title).toBe("My Original Story");

    // 2. Create Variant B for the same issue, without stories property in input
    const resultIssue2 = await createIssue({
      title: "Story Test Issue",
      number: "42",
      format: "Heft",
      variant: "B",
      series: {
        title: seriesTitle,
        volume: 1,
        publisher: {
          name: publisherName,
          us: false,
        },
      },
    });

    expect(resultIssue2.success).toBe(true);
    if (!resultIssue2.success) throw new Error("Expected resultIssue2 to be successful");
    expect(BigInt(resultIssue2.data.item.id)).toBe(parentId); // Reuses parent issue

    // 3. Verify story still exists on parent issue (was NOT deleted!)
    const afterStories = await prisma.story.findMany({
      where: { fkIssue: parentId },
    });
    expect(afterStories.length).toBe(1);
    expect(afterStories[0].title).toBe("My Original Story");

    // Clean up
    await prisma.story.deleteMany({
      where: { fkIssue: parentId },
    });
    await prisma.variant.deleteMany({
      where: { fkIssue: parentId },
    });
    await prisma.issue.delete({
      where: { id: parentId },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (globalThis.__shortboxPrismaPool__) {
      await globalThis.__shortboxPrismaPool__.end();
    }
  });
});
