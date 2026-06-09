import { resolveFilterState } from "./filter-read";
import { prisma } from "../prisma/client";

describe("onlySellingList integration tests", () => {
  let publisherId: bigint;
  let nonPaniniPublisherId: bigint;
  let series1Id: bigint;
  let series2Id: bigint;
  let nonPaniniSeriesId: bigint;
  let gratisSeriesId: bigint;
  let marvelTagSeriesId: bigint;
  let spidermanKomplettSeriesId: bigint;

  let issueIds: bigint[] = [];
  let variantIds: bigint[] = [];

  beforeEach(async () => {
    issueIds = [];
    variantIds = [];

    const publisher = await prisma.publisher.create({
      data: {
        name: "Panini Publisher " + Math.random().toString(36).substring(7),
        original: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    publisherId = publisher.id;

    const nonPaniniPublisher = await prisma.publisher.create({
      data: {
        name: "Other Publisher " + Math.random().toString(36).substring(7),
        original: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    nonPaniniPublisherId = nonPaniniPublisher.id;

    // Series 1: 2 issues
    const series1 = await prisma.series.create({
      data: {
        title: "Test Series 1 " + Math.random().toString(36).substring(7),
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: publisherId,
      },
    });
    series1Id = series1.id;

    // Series 2: 1 issue
    const series2 = await prisma.series.create({
      data: {
        title: "Test Series 2 " + Math.random().toString(36).substring(7),
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: publisherId,
      },
    });
    series2Id = series2.id;

    // Non-Panini Series
    const nonPaniniSeries = await prisma.series.create({
      data: {
        title: "Non-Panini Series " + Math.random().toString(36).substring(7),
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: nonPaniniPublisherId,
      },
    });
    nonPaniniSeriesId = nonPaniniSeries.id;

    // Series containing "Gratis"
    const gratisSeries = await prisma.series.create({
      data: {
        title: "Gratis Comic Tag Series",
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: publisherId,
      },
    });
    gratisSeriesId = gratisSeries.id;

    // Series containing "Marvel Tag"
    const marvelTagSeries = await prisma.series.create({
      data: {
        title: "Marvel Tag Special Series",
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: publisherId,
      },
    });
    marvelTagSeriesId = marvelTagSeries.id;

    // Series containing "Spider-Man Komplett"
    const spidermanKomplettSeries = await prisma.series.create({
      data: {
        title: "Spider-Man Komplett 2004",
        volume: 1n,
        startYear: 2026n,
        genre: "Action",
        createdAt: new Date(),
        updatedAt: new Date(),
        fkPublisher: publisherId,
      },
    });
    spidermanKomplettSeriesId = spidermanKomplettSeries.id;
  });

  afterEach(async () => {
    // Delete variants
    if (variantIds.length > 0) {
      await prisma.variant.deleteMany({
        where: { id: { in: variantIds } },
      });
    }
    // Delete issues
    const allIssueIds = [...issueIds];
    if (allIssueIds.length > 0) {
      await prisma.issue.deleteMany({
        where: { id: { in: allIssueIds } },
      });
    }
    // Delete series
    const seriesIds = [
      series1Id,
      series2Id,
      nonPaniniSeriesId,
      gratisSeriesId,
      marvelTagSeriesId,
      spidermanKomplettSeriesId,
    ].filter(Boolean);
    if (seriesIds.length > 0) {
      await prisma.series.deleteMany({
        where: { id: { in: seriesIds } },
      });
    }
    // Delete publishers
    const publisherIds = [publisherId, nonPaniniPublisherId].filter(Boolean);
    if (publisherIds.length > 0) {
      await prisma.publisher.deleteMany({
        where: { id: { in: publisherIds } },
      });
    }
  });

  it("should filter out series where we own all issues but not all are selling candidates", async () => {
    // Create two issues for Series 1:
    // User owns both (noOwnedVariants: false)
    const issue1 = await prisma.issue.create({
      data: {
        title: "Issue 1",
        number: "1",
        fkSeries: series1Id,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        doublePublisherCollected: true, // selling candidate
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(issue1.id);

    const issue2 = await prisma.issue.create({
      data: {
        title: "Issue 2",
        number: "2",
        fkSeries: series1Id,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        doublePublisherCollected: false, // NOT selling candidate
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(issue2.id);

    // Create one issue for Series 2:
    // User owns it, and it IS selling candidate
    const issue3 = await prisma.issue.create({
      data: {
        title: "Issue 3",
        number: "1",
        fkSeries: series2Id,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        doublePublisherCollected: true, // selling candidate
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(issue3.id);

    const result = await resolveFilterState({
      onlySellingList: true,
      us: false,
    });

    const ids = result.filteredIssueIds || [];
    expect(ids).toContain(Number(issue3.id));
    expect(ids).not.toContain(Number(issue1.id));
    expect(ids).not.toContain(Number(issue2.id));
  });

  it("should exclude issues from non-Panini publishers", async () => {
    const nonPaniniIssue = await prisma.issue.create({
      data: {
        title: "Non-Panini Issue",
        number: "1",
        fkSeries: nonPaniniSeriesId,
        fkPublisher: nonPaniniPublisherId,
        noOwnedVariants: false,
        doublePublisherCollected: true, // selling candidate, but wrong publisher name
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(nonPaniniIssue.id);

    const result = await resolveFilterState({
      onlySellingList: true,
      us: false,
    });

    const ids = result.filteredIssueIds || [];
    expect(ids).not.toContain(Number(nonPaniniIssue.id));
  });

  it("should exclude reprint-only issues if we own a Hardcover variant, but keep them if we only own a Softcover variant", async () => {
    // 1. Excluded: reprint-only issue with owned Hardcover
    const issueHC = await prisma.issue.create({
      data: {
        title: "Reprint HC Issue",
        number: "1",
        fkSeries: series2Id,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        isReprintOnly: true,
        doublePublisherCollected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(issueHC.id);

    const variantHC = await prisma.variant.create({
      data: {
        fkIssue: issueHC.id,
        format: "Hardcover",
        collected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    variantIds.push(variantHC.id);

    // 2. Kept: reprint-only issue with owned Softcover
    const issueSC = await prisma.issue.create({
      data: {
        title: "Reprint SC Issue",
        number: "2",
        fkSeries: series1Id,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        isReprintOnly: true,
        doublePublisherCollected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(issueSC.id);

    const variantSC = await prisma.variant.create({
      data: {
        fkIssue: issueSC.id,
        format: "Softcover",
        collected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    variantIds.push(variantSC.id);

    const result = await resolveFilterState({
      onlySellingList: true,
      us: false,
    });

    const ids = result.filteredIssueIds || [];
    expect(ids).toContain(Number(issueSC.id));
    expect(ids).not.toContain(Number(issueHC.id));
  });

  it("should exclude issues in series with titles containing Gratis, Marvel Tag, or Spider-Man Komplett", async () => {
    // 1. Gratis series issue
    const gratisIssue = await prisma.issue.create({
      data: {
        title: "Gratis Issue",
        number: "1",
        fkSeries: gratisSeriesId,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        doublePublisherCollected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(gratisIssue.id);

    // 2. Marvel Tag series issue
    const marvelTagIssue = await prisma.issue.create({
      data: {
        title: "Marvel Tag Issue",
        number: "1",
        fkSeries: marvelTagSeriesId,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        doublePublisherCollected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(marvelTagIssue.id);

    // 3. Spider-Man Komplett series issue
    const spidermanKomplettIssue = await prisma.issue.create({
      data: {
        title: "Spider-Man Komplett Issue",
        number: "1",
        fkSeries: spidermanKomplettSeriesId,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        doublePublisherCollected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(spidermanKomplettIssue.id);

    const result = await resolveFilterState({
      onlySellingList: true,
      us: false,
    });

    const ids = result.filteredIssueIds || [];
    expect(ids).not.toContain(Number(gratisIssue.id));
    expect(ids).not.toContain(Number(marvelTagIssue.id));
    expect(ids).not.toContain(Number(spidermanKomplettIssue.id));
  });

  it("should exclude issues that contain first prints", async () => {
    const firstPrintIssue = await prisma.issue.create({
      data: {
        title: "First Print Issue",
        number: "1",
        fkSeries: series2Id,
        fkPublisher: publisherId,
        noOwnedVariants: false,
        hasFirstPrint: true, // has first print story
        doublePublisherCollected: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    issueIds.push(firstPrintIssue.id);

    const result = await resolveFilterState({
      onlySellingList: true,
      us: false,
    });

    const ids = result.filteredIssueIds || [];
    expect(ids).not.toContain(Number(firstPrintIssue.id));
  });
});
