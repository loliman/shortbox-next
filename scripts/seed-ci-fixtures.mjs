import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const now = new Date("2026-01-01T00:00:00.000Z");

async function main() {
  await prisma.coverIndividual.deleteMany({});
  await prisma.issueIndividual.deleteMany({});
  await prisma.issueArc.deleteMany({});
  await prisma.storyAppearance.deleteMany({});
  await prisma.storyIndividual.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.cover.deleteMany({});
  await prisma.issue.deleteMany({});
  await prisma.arc.deleteMany({});
  await prisma.appearance.deleteMany({});
  await prisma.individual.deleteMany({});
  await prisma.series.deleteMany({});
  await prisma.publisher.deleteMany({});

  const dePublisher = await prisma.publisher.create({
    data: {
      id: 1001n,
      name: "Panini - Marvel & Icon",
      original: false,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      startYear: 1997n,
      endYear: null,
    },
  });

  const usPublisher = await prisma.publisher.create({
    data: {
      id: 1002n,
      name: "Marvel Comics",
      original: true,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      startYear: 1939n,
      endYear: null,
    },
  });

  const deSeries = await prisma.series.create({
    data: {
      id: 2001n,
      title: "Marvel Horror Classic Collection",
      startYear: 2022n,
      endYear: null,
      volume: 1n,
      genre: "Horror",
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkPublisher: dePublisher.id,
    },
  });

  const usSeries = await prisma.series.create({
    data: {
      id: 2002n,
      title: "Crypt of Shadows",
      startYear: 2022n,
      endYear: null,
      volume: 3n,
      genre: "Horror",
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkPublisher: usPublisher.id,
    },
  });

  const dracula = await prisma.individual.create({
    data: {
      id: 6001n,
      name: "Dracula",
      createdAt: now,
      updatedAt: now,
    },
  });

  const marvWolfman = await prisma.individual.create({
    data: {
      id: 6002n,
      name: "Marv Wolfman",
      createdAt: now,
      updatedAt: now,
    },
  });

  const mikePloog = await prisma.individual.create({
    data: {
      id: 6003n,
      name: "Mike Ploog",
      createdAt: now,
      updatedAt: now,
    },
  });

  const horrorAppearance = await prisma.appearance.create({
    data: {
      id: 7001n,
      name: "Dracula",
      type: "character",
      createdAt: now,
      updatedAt: now,
    },
  });

  const horrorArc = await prisma.arc.create({
    data: {
      id: 8001n,
      title: "Marvel Horror",
      type: "collection",
      createdAt: now,
      updatedAt: now,
    },
  });

  const deIssue = await prisma.issue.create({
    data: {
      id: 3001n,
      title: "Marvel Horror Classic Collection",
      number: "1",
      format: "",
      limitation: null,
      variant: null,
      releaseDate: now,
      pages: 160n,
      price: null,
      currency: null,
      addInfo: "",
      verified: true,
      createdAt: now,
      updatedAt: now,
      fkSeries: deSeries.id,
      comicGuideId: null,
      collected: false,
      isbn: null,
      legacyNumber: "",
    },
  });

  const deHardcoverIssue = await prisma.issue.create({
    data: {
      id: 3002n,
      title: "Marvel Horror Classic Collection",
      number: "1",
      format: "Hardcover",
      limitation: null,
      variant: null,
      releaseDate: now,
      pages: 160n,
      price: null,
      currency: null,
      addInfo: "",
      verified: true,
      createdAt: now,
      updatedAt: now,
      fkSeries: deSeries.id,
      comicGuideId: null,
      collected: false,
      isbn: null,
      legacyNumber: "",
    },
  });

  const usIssue = await prisma.issue.create({
    data: {
      id: 3003n,
      title: "Crypt of Shadows",
      number: "1",
      format: "",
      limitation: null,
      variant: null,
      releaseDate: now,
      pages: 64n,
      price: null,
      currency: null,
      addInfo: "",
      verified: true,
      createdAt: now,
      updatedAt: now,
      fkSeries: usSeries.id,
      comicGuideId: null,
      collected: false,
      isbn: null,
      legacyNumber: "",
    },
  });

  await prisma.issueArc.createMany({
    data: [
      {
        fkIssue: deIssue.id,
        fkArc: horrorArc.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        fkIssue: deHardcoverIssue.id,
        fkArc: horrorArc.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        fkIssue: usIssue.id,
        fkArc: horrorArc.id,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  await prisma.issueIndividual.createMany({
    data: [
      {
        fkIssue: deIssue.id,
        fkIndividual: dracula.id,
        type: "character",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkIssue: deHardcoverIssue.id,
        fkIndividual: dracula.id,
        type: "character",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkIssue: usIssue.id,
        fkIndividual: dracula.id,
        type: "character",
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  const softcoverCover = await prisma.cover.create({
    data: {
      id: 4001n,
      url: "https://example.com/ci-cover-marvel-horror-softcover.jpg",
      number: 1n,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkIssue: deIssue.id,
      fkParent: null,
    },
  });

  const hardcoverCover = await prisma.cover.create({
    data: {
      id: 4002n,
      url: "https://example.com/ci-cover-marvel-horror-hardcover.jpg",
      number: 1n,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkIssue: deHardcoverIssue.id,
      fkParent: null,
    },
  });

  await prisma.coverIndividual.createMany({
    data: [
      {
        fkCover: softcoverCover.id,
        fkIndividual: mikePloog.id,
        type: "artist",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkCover: hardcoverCover.id,
        fkIndividual: mikePloog.id,
        type: "artist",
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  const usStory = await prisma.story.create({
    data: {
      id: 5001n,
      title: "The Crypt Opens",
      number: 1n,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkIssue: usIssue.id,
      fkParent: null,
      fkReprint: null,
      onlyApp: false,
      onlyTb: false,
      otherOnlyTb: false,
      onlyOnePrint: false,
      collected: false,
      collectedMultipleTimes: false,
      firstApp: true,
      part: "",
    },
  });

  const deParentStory = await prisma.story.create({
    data: {
      id: 5002n,
      title: "Vorwort aus der Gruft",
      number: 1n,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkIssue: deIssue.id,
      fkParent: null,
      fkReprint: null,
      onlyApp: false,
      onlyTb: false,
      otherOnlyTb: false,
      onlyOnePrint: false,
      collected: true,
      collectedMultipleTimes: false,
      firstApp: false,
      part: "",
    },
  });

  const deStory = await prisma.story.create({
    data: {
      id: 5003n,
      title: "Draculas Rückkehr",
      number: 2n,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkIssue: deIssue.id,
      fkParent: deParentStory.id,
      fkReprint: usStory.id,
      onlyApp: false,
      onlyTb: false,
      otherOnlyTb: false,
      onlyOnePrint: false,
      collected: true,
      collectedMultipleTimes: true,
      firstApp: false,
      part: "1",
    },
  });

  const deBackupStory = await prisma.story.create({
    data: {
      id: 5004n,
      title: "Nächte des Schreckens",
      number: 3n,
      addInfo: "",
      createdAt: now,
      updatedAt: now,
      fkIssue: deIssue.id,
      fkParent: null,
      fkReprint: null,
      onlyApp: false,
      onlyTb: false,
      otherOnlyTb: false,
      onlyOnePrint: false,
      collected: false,
      collectedMultipleTimes: false,
      firstApp: false,
      part: "",
    },
  });

  await prisma.storyIndividual.createMany({
    data: [
      {
        fkStory: usStory.id,
        fkIndividual: marvWolfman.id,
        type: "writer",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkStory: deStory.id,
        fkIndividual: marvWolfman.id,
        type: "writer",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkStory: deStory.id,
        fkIndividual: dracula.id,
        type: "character",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkStory: deBackupStory.id,
        fkIndividual: dracula.id,
        type: "character",
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  await prisma.storyAppearance.createMany({
    data: [
      {
        fkAppearance: horrorAppearance.id,
        fkStory: usStory.id,
        role: "featured",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkAppearance: horrorAppearance.id,
        fkStory: deStory.id,
        role: "featured",
        createdAt: now,
        updatedAt: now,
      },
      {
        fkAppearance: horrorAppearance.id,
        fkStory: deBackupStory.id,
        role: "cameo",
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  console.log("Seeded CI fixtures.");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
