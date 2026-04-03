import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import fixture from "./fixtures/marvel-horror-classic-collection-1.json" with { type: "json" };

const prismaPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prismaAdapter = new PrismaPg(prismaPool);

const prisma = new PrismaClient({
  adapter: prismaAdapter,
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
const now = new Date("2026-01-01T00:00:00.000Z");

function asBigInt(value) {
  return value == null ? null : BigInt(value);
}

function asDate(value) {
  return value == null ? null : new Date(value);
}

function withTimestamps(data) {
  return { ...data, createdAt: now, updatedAt: now };
}

async function createStories(stories) {
  const pending = [...stories];
  const inserted = new Set();

  while (pending.length > 0) {
    const ready = pending.filter(
      (story) =>
        (story.fkParent == null || inserted.has(story.fkParent)) &&
        (story.fkReprint == null || inserted.has(story.fkReprint)),
    );

    if (ready.length === 0) {
      throw new Error("Unable to resolve story parent/reprint dependencies");
    }

    await prisma.story.createMany({
      data: ready.map((story) =>
        withTimestamps({
          id: asBigInt(story.id),
          title: story.title,
          number: asBigInt(story.number),
          addInfo: story.addInfo,
          fkIssue: asBigInt(story.fkIssue),
          fkParent: asBigInt(story.fkParent),
          fkReprint: asBigInt(story.fkReprint),
          onlyApp: story.onlyApp,
          onlyTb: story.onlyTb,
          otherOnlyTb: story.otherOnlyTb,
          onlyOnePrint: story.onlyOnePrint,
          collected: story.collected,
          collectedMultipleTimes: story.collectedMultipleTimes,
          firstApp: story.firstApp,
          part: story.part,
        }),
      ),
    });

    for (const story of ready) {
      inserted.add(story.id);
    }

    pending.splice(
      0,
      pending.length,
      ...pending.filter((story) => !inserted.has(story.id)),
    );
  }
}

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

  await prisma.publisher.createMany({
    data: fixture.publishers.map((publisher) =>
      withTimestamps({
        id: asBigInt(publisher.id),
        name: publisher.name,
        original: publisher.original,
        addInfo: publisher.addInfo,
        startYear: asBigInt(publisher.startYear),
        endYear: asBigInt(publisher.endYear),
      }),
    ),
  });

  await prisma.series.createMany({
    data: fixture.series.map((series) =>
      withTimestamps({
        id: asBigInt(series.id),
        title: series.title,
        startYear: asBigInt(series.startYear),
        endYear: asBigInt(series.endYear),
        volume: asBigInt(series.volume),
        genre: series.genre,
        addInfo: series.addInfo,
        fkPublisher: asBigInt(series.fkPublisher),
      }),
    ),
  });

  await prisma.issue.createMany({
    data: fixture.issues.map((issue) =>
      withTimestamps({
        id: asBigInt(issue.id),
        title: issue.title,
        number: issue.number,
        format: issue.format,
        variant: issue.variant,
        releaseDate: asDate(issue.releaseDate),
        pages: asBigInt(issue.pages),
        price: issue.price,
        currency: issue.currency,
        addInfo: issue.addInfo,
        fkSeries: asBigInt(issue.fkSeries),
        comicGuideId: asBigInt(issue.comicGuideId),
        isbn: issue.isbn,
        legacyNumber: issue.legacyNumber,
        collected: issue.collected,
      }),
    ),
  });

  await prisma.cover.createMany({
    data: fixture.covers.map((cover) =>
      withTimestamps({
        id: asBigInt(cover.id),
        url: cover.url,
        number: asBigInt(cover.number),
        addInfo: cover.addInfo,
        fkParent: asBigInt(cover.fkParent),
        fkIssue: asBigInt(cover.fkIssue),
      }),
    ),
  });

  await prisma.individual.createMany({
    data: fixture.individuals.map((individual) =>
      withTimestamps({
        id: asBigInt(individual.id),
        name: individual.name,
      }),
    ),
  });

  await prisma.appearance.createMany({
    data: fixture.appearances.map((appearance) =>
      withTimestamps({
        id: asBigInt(appearance.id),
        name: appearance.name,
        type: appearance.type,
      }),
    ),
  });

  await prisma.arc.createMany({
    data: fixture.arcs.map((arc) =>
      withTimestamps({
        id: asBigInt(arc.id),
        title: arc.title,
        type: arc.type,
      }),
    ),
  });

  await createStories(fixture.stories);

  await prisma.coverIndividual.createMany({
    data: fixture.coverIndividuals.map((link) =>
      withTimestamps({
        fkCover: asBigInt(link.fkCover),
        fkIndividual: asBigInt(link.fkIndividual),
        type: link.type,
      }),
    ),
  });

  await prisma.issueIndividual.createMany({
    data: fixture.issueIndividuals.map((link) =>
      withTimestamps({
        fkIssue: asBigInt(link.fkIssue),
        fkIndividual: asBigInt(link.fkIndividual),
        type: link.type,
      }),
    ),
  });

  await prisma.issueArc.createMany({
    data: fixture.issueArcs.map((link) =>
      withTimestamps({
        fkIssue: asBigInt(link.fkIssue),
        fkArc: asBigInt(link.fkArc),
      }),
    ),
  });

  await prisma.storyIndividual.createMany({
    data: fixture.storyIndividuals.map((link) =>
      withTimestamps({
        fkStory: asBigInt(link.fkStory),
        fkIndividual: asBigInt(link.fkIndividual),
        type: link.type,
      }),
    ),
  });

  await prisma.storyAppearance.createMany({
    data: fixture.storyAppearances.map((link) =>
      withTimestamps({
        fkStory: asBigInt(link.fkStory),
        fkAppearance: asBigInt(link.fkAppearance),
        role: link.role,
      }),
    ),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await prismaPool.end();
  });
