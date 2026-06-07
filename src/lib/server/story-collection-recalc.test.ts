import { handleIssueWriteEffects } from "./issue-materialize-write";
import { prisma } from "../prisma/client";

describe("Story collection recalculation", () => {
  let usPublisherId: bigint;
  let dePublisherId: bigint;
  let usSeriesId: bigint;
  let deSeriesId: bigint;
  let usIssueId: bigint;
  let deIssueId: bigint;
  let usVariantId: bigint;
  let deVariantId: bigint;
  let usStoryId: bigint;
  let deStoryId: bigint;

  const rand = () => Math.random().toString(36).substring(7);

  beforeEach(async () => {
    // 1. Create Publishers
    const usPublisher = await prisma.publisher.create({
      data: {
        name: "US Pub " + rand(),
        original: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    usPublisherId = usPublisher.id;

    const dePublisher = await prisma.publisher.create({
      data: {
        name: "DE Pub " + rand(),
        original: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    dePublisherId = dePublisher.id;

    // 2. Create Series
    const usSeries = await prisma.series.create({
      data: {
        title: "US Series " + rand(),
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: usPublisherId,
      },
    });
    usSeriesId = usSeries.id;

    const deSeries = await prisma.series.create({
      data: {
        title: "DE Series " + rand(),
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: dePublisherId,
      },
    });
    deSeriesId = deSeries.id;

    // 3. Create Issues
    const usIssue = await prisma.issue.create({
      data: {
        title: "US Issue 1",
        number: "1",
        fkSeries: usSeriesId,
        fkPublisher: usPublisherId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    usIssueId = usIssue.id;

    const deIssue = await prisma.issue.create({
      data: {
        title: "DE Issue 1",
        number: "1",
        fkSeries: deSeriesId,
        fkPublisher: dePublisherId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    deIssueId = deIssue.id;

    // 4. Create Variants
    const usVariant = await prisma.variant.create({
      data: {
        fkIssue: usIssueId,
        format: "Comic",
        variantLabel: "Standard",
        createdAt: new Date(),
        updatedAt: new Date(),
        collected: false,
      },
    });
    usVariantId = usVariant.id;

    const deVariant = await prisma.variant.create({
      data: {
        fkIssue: deIssueId,
        format: "Softcover",
        variantLabel: "Standard",
        createdAt: new Date(),
        updatedAt: new Date(),
        collected: false,
      },
    });
    deVariantId = deVariant.id;

    // 5. Create Stories
    const usStory = await prisma.story.create({
      data: {
        fkIssue: usIssueId,
        number: 1n,
        part: "",
        title: "US Story",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    usStoryId = usStory.id;

    const deStory = await prisma.story.create({
      data: {
        fkIssue: deIssueId,
        number: 1n,
        part: "",
        title: "DE Reprint Story",
        fkParent: usStoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    deStoryId = deStory.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.story.deleteMany({
      where: { id: { in: [usStoryId, deStoryId] } },
    });
    await prisma.variant.deleteMany({
      where: { id: { in: [usVariantId, deVariantId] } },
    });
    await prisma.issue.deleteMany({
      where: { id: { in: [usIssueId, deIssueId] } },
    });
    await prisma.series.deleteMany({
      where: { id: { in: [usSeriesId, deSeriesId] } },
    });
    await prisma.publisher.deleteMany({
      where: { id: { in: [usPublisherId, dePublisherId] } },
    });
  });

  it("should update story collected and collectedMultipleTimes flags on write effects", async () => {
    // Initially false
    let storyUs = await prisma.story.findUnique({ where: { id: usStoryId } });
    let storyDe = await prisma.story.findUnique({ where: { id: deStoryId } });
    expect(storyUs?.collected).toBe(false);
    expect(storyUs?.collectedMultipleTimes).toBe(false);
    expect(storyDe?.collected).toBe(false);
    expect(storyDe?.collectedMultipleTimes).toBe(false);

    // 1. Collect DE variant
    await prisma.variant.update({
      where: { id: deVariantId },
      data: { collected: true },
    });
    await handleIssueWriteEffects(deIssueId, prisma);

    storyUs = await prisma.story.findUnique({ where: { id: usStoryId } });
    storyDe = await prisma.story.findUnique({ where: { id: deStoryId } });
    expect(storyUs?.collected).toBe(true);
    expect(storyUs?.collectedMultipleTimes).toBe(false);
    expect(storyDe?.collected).toBe(true);
    expect(storyDe?.collectedMultipleTimes).toBe(false);

    // 2. Collect US variant as well (collected multiple times should become true)
    await prisma.variant.update({
      where: { id: usVariantId },
      data: { collected: true },
    });
    await handleIssueWriteEffects(usIssueId, prisma);

    storyUs = await prisma.story.findUnique({ where: { id: usStoryId } });
    storyDe = await prisma.story.findUnique({ where: { id: deStoryId } });
    expect(storyUs?.collected).toBe(true);
    expect(storyUs?.collectedMultipleTimes).toBe(true);
    expect(storyDe?.collected).toBe(true);
    expect(storyDe?.collectedMultipleTimes).toBe(true);

    // 3. Uncollect DE variant
    await prisma.variant.update({
      where: { id: deVariantId },
      data: { collected: false },
    });
    await handleIssueWriteEffects(deIssueId, prisma);

    storyUs = await prisma.story.findUnique({ where: { id: usStoryId } });
    storyDe = await prisma.story.findUnique({ where: { id: deStoryId } });
    expect(storyUs?.collected).toBe(true);
    expect(storyUs?.collectedMultipleTimes).toBe(false);
    expect(storyDe?.collected).toBe(true);
    expect(storyDe?.collectedMultipleTimes).toBe(false);

    // 4. Uncollect US variant
    await prisma.variant.update({
      where: { id: usVariantId },
      data: { collected: false },
    });
    await handleIssueWriteEffects(usIssueId, prisma);

    storyUs = await prisma.story.findUnique({ where: { id: usStoryId } });
    storyDe = await prisma.story.findUnique({ where: { id: deStoryId } });
    expect(storyUs?.collected).toBe(false);
    expect(storyUs?.collectedMultipleTimes).toBe(false);
    expect(storyDe?.collected).toBe(false);
    expect(storyDe?.collectedMultipleTimes).toBe(false);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (globalThis.__shortboxPrismaPool__) {
      await globalThis.__shortboxPrismaPool__.end();
    }
  });
});
