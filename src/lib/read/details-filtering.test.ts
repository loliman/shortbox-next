import { readPublisherDetailsQuery } from "./publisher-details-read";
import { readSeriesDetailsQuery } from "./series-details-read";
import { prisma } from "../prisma/client";

describe("Publisher & Series details query filtering", () => {
  let publisherId: bigint;
  let seriesId: bigint;
  let issueIdA: bigint;
  let issueIdB: bigint;
  let variantIdA: bigint;
  let variantIdB: bigint;

  const rand = () => Math.random().toString(36).substring(7);

  beforeEach(async () => {
    // 1. Create Publisher
    const publisher = await prisma.publisher.create({
      data: {
        name: "Test Pub " + rand(),
        original: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    publisherId = publisher.id;

    // 2. Create Series
    const series = await prisma.series.create({
      data: {
        title: "Test Series " + rand(),
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: publisherId,
      },
    });
    seriesId = series.id;

    // 3. Create Issues
    const issueA = await prisma.issue.create({
      data: {
        title: "Issue A",
        number: "1",
        fkSeries: seriesId,
        fkPublisher: publisherId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIdA = issueA.id;

    const issueB = await prisma.issue.create({
      data: {
        title: "Issue B",
        number: "2",
        fkSeries: seriesId,
        fkPublisher: publisherId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIdB = issueB.id;

    // 4. Create Variants (A is uncollected, B is collected)
    const variantA = await prisma.variant.create({
      data: {
        fkIssue: issueIdA,
        format: "Softcover",
        variantLabel: "Standard",
        createdAt: new Date(),
        updatedAt: new Date(),
        collected: false,
      },
    });
    variantIdA = variantA.id;

    const variantB = await prisma.variant.create({
      data: {
        fkIssue: issueIdB,
        format: "Softcover",
        variantLabel: "Standard",
        createdAt: new Date(),
        updatedAt: new Date(),
        collected: true,
      },
    });
    variantIdB = variantB.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.variant.deleteMany({
      where: { id: { in: [variantIdA, variantIdB] } },
    });
    await prisma.issue.deleteMany({
      where: { id: { in: [issueIdA, issueIdB] } },
    });
    await prisma.series.deleteMany({
      where: { id: { in: [seriesId] } },
    });
    await prisma.publisher.deleteMany({
      where: { id: { in: [publisherId] } },
    });
  });

  it("should filter publisher details issues when onlyCollected filter is applied", async () => {
    const pub = await prisma.publisher.findUnique({ where: { id: publisherId } });
    if (!pub) throw new Error("Publisher not found");

    // 1. Unfiltered
    const resultUnfiltered = await readPublisherDetailsQuery({
      us: false,
      publisher: pub.name || "",
    });
    expect(resultUnfiltered).not.toBeNull();
    expect(resultUnfiltered!.details.issueCount).toBe(2);
    expect(resultUnfiltered!.issues.map((i) => i.id)).toContain(String(issueIdA));
    expect(resultUnfiltered!.issues.map((i) => i.id)).toContain(String(issueIdB));

    // 2. Filtered: onlyCollected
    const resultFiltered = await readPublisherDetailsQuery({
      us: false,
      publisher: pub.name || "",
      query: {
        filter: JSON.stringify({ onlyCollected: true, us: false }),
      },
    });
    expect(resultFiltered).not.toBeNull();
    expect(resultFiltered!.details.issueCount).toBe(1);
    expect(resultFiltered!.issues.map((i) => i.id)).not.toContain(String(issueIdA));
    expect(resultFiltered!.issues.map((i) => i.id)).toContain(String(issueIdB));
  });

  it("should filter series details issues when onlyCollected filter is applied", async () => {
    const s = await prisma.series.findUnique({
      where: { id: seriesId },
      include: { publisher: true },
    });
    if (!s || !s.publisher) throw new Error("Series not found");

    const input = {
      us: false,
      publisher: s.publisher.name || "",
      series: s.title || "",
      volume: Number(s.volume),
      startyear: Number(s.startYear),
    };

    // 1. Unfiltered
    const resultUnfiltered = await readSeriesDetailsQuery(input);
    expect(resultUnfiltered).not.toBeNull();
    expect(resultUnfiltered!.details.issueCount).toBe(2);
    expect(resultUnfiltered!.issues.map((i) => i.id)).toContain(String(issueIdA));
    expect(resultUnfiltered!.issues.map((i) => i.id)).toContain(String(issueIdB));

    // 2. Filtered: onlyCollected
    const resultFiltered = await readSeriesDetailsQuery({
      ...input,
      query: {
        filter: JSON.stringify({ onlyCollected: true, us: false }),
      },
    });
    expect(resultFiltered).not.toBeNull();
    expect(resultFiltered!.details.issueCount).toBe(1);
    expect(resultFiltered!.issues.map((i) => i.id)).not.toContain(String(issueIdA));
    expect(resultFiltered!.issues.map((i) => i.id)).toContain(String(issueIdB));
  });
});
