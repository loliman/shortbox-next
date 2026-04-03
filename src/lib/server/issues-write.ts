import type { PrismaClient, Prisma } from "@prisma/client";
import "server-only";

import { prisma } from "../prisma/client";
import { updateStoryFilterFlagsForIssue } from "./story-filter-write";
import { MarvelCrawlerService } from "./marvel-crawler";
import {
  linkCoverIndividuals,
  linkIssueArcs,
  linkIssueIndividuals,
  linkStoryAppearances,
  linkStoryIndividuals,
} from "./issues-write-links";
import {
  coerceReleaseDateForDb,
  normalizeBigInt,
  normalizeDbIds,
  normalizeFloat,
  normalizeOptionalText,
  normalizeStoryTitleKey,
  normalizeText,
} from "./issues-write-shared";
import { Result, success, failure } from "@/src/types/result";
import { buildVariantBatchLabels, type IssueCopyBatchInput } from "@/src/util/issue-copy";

type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

type PublisherRef = {
  name?: string | null;
  us?: boolean | null;
};

type StoryParentIssueRef = {
  number?: string | null;
  series?: {
    title?: string | null;
    volume?: number | null;
  };
};

type StoryParentRef = {
  number?: number | null;
  issue?: StoryParentIssueRef;
};

type StoryIndividualInput = {
  name?: string | null;
  type?: string | string[] | null;
};

type StoryAppearanceInput = {
  name?: string | null;
  type?: string | null;
  role?: string | null;
};

type CrawledNamedType = {
  name?: string;
  type?: string | string[];
};

type CrawledArcLike = {
  title?: string;
  type?: string;
};

type CrawledAppearanceLike = {
  name?: string;
  type?: string;
  role?: string;
};

type CrawledCoverLike = {
  number?: number;
  url?: string;
  individuals?: CrawledNamedType[];
};

type CrawledStoryLike = {
  number?: number;
  title?: string;
  addinfo?: string;
  part?: string;
  individuals?: CrawledNamedType[];
  appearances?: CrawledAppearanceLike[];
};

type CrawledVariantLike = {
  number?: string;
  legacyNumber?: string;
  format?: string;
  variant?: string;
  releasedate?: string;
  price?: number;
  currency?: string;
  cover?: CrawledCoverLike;
};

type CrawledIssueLike = {
  legacyNumber?: string;
  releasedate?: string;
  price?: number;
  currency?: string;
  cover?: CrawledCoverLike;
  stories?: CrawledStoryLike[];
  individuals?: CrawledNamedType[];
  arcs?: CrawledArcLike[];
  variants?: CrawledVariantLike[];
  collectedIssues?: Array<{
    number?: string;
    storyTitle?: string;
    series?: {
      title?: string;
      volume?: number;
    };
  }>;
  containedIssues?: Array<{
    number?: string;
    storyTitle?: string;
    series?: {
      title?: string;
      volume?: number;
    };
  }>;
};

type StoryInput = {
  number?: number | null;
  title?: string | null;
  addinfo?: string | null;
  part?: string | null;
  individuals?: StoryIndividualInput[];
  appearances?: StoryAppearanceInput[];
  parent?: StoryParentRef;
};

const crawler = new MarvelCrawlerService();
const ISSUE_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 120_000,
} as const;

type ParentIssueRef = {
  issueId: bigint;
  storyTitle?: string;
};

type IssueInput = {
  id?: string | number | null;
  title?: string | null;
  number?: string | null;
  format?: string | null;
  variant?: string | null;
  releasedate?: string | null;
  pages?: number | null;
  price?: number | null;
  currency?: string | null;
  comicguideid?: string | number | null;
  legacy_number?: string | null;
  isbn?: string | null;
  limitation?: string | null;
  addinfo?: string | null;
  verified?: boolean;
  collected?: boolean;
  stories?: StoryInput[];
  series?: {
    title?: string | null;
    volume?: number | null;
    publisher?: PublisherRef | null;
  } | null;
};

type IssueSeriesMeta = {
  title: string;
  volume: number;
  startyear: number;
  endyear: number;
  publisher?: {
    name: string;
    us: boolean;
  };
};

type IssueWriteMeta = {
  createdSeries?: IssueSeriesMeta;
};

type IssueWriteItemResult = {
  item: ReturnType<typeof toIssuePayload>;
  meta?: IssueWriteMeta;
};

type IssueWriteBatchResult = {
  items: Array<ReturnType<typeof toIssuePayload>>;
  meta?: IssueWriteMeta;
};

export async function createIssue(item: IssueInput): Promise<Result<IssueWriteItemResult>> {
  try {
    const res = await prisma.$transaction(async (tx) => {
      return createIssueRecord(item, tx);
    }, ISSUE_TRANSACTION_OPTIONS);
    return success(res);
  } catch (error) {
    return failure(error as Error);
  }
}

export async function createIssueBatch(
  item: IssueInput,
  batch: IssueCopyBatchInput
): Promise<Result<IssueWriteBatchResult>> {
  try {
    const res = await prisma.$transaction(async (tx) => {
      const variants = buildVariantBatchLabels(batch);
      const createdItems: Array<ReturnType<typeof toIssuePayload>> = [];
      let meta: IssueWriteMeta | undefined;

      for (const variant of variants) {
        const createdResult = await createIssueRecord(
          {
            ...item,
            variant,
          },
          tx
        );
        createdItems.push(createdResult.item);
        if (!meta?.createdSeries && createdResult.meta?.createdSeries) {
          meta = createdResult.meta;
        }
      }

      return {
        items: createdItems,
        ...(meta ? { meta } : {}),
      };
    }, ISSUE_TRANSACTION_OPTIONS);
    return success(res);
  } catch (error) {
    return failure(error as Error);
  }
}

export async function editIssue(oldItem: IssueInput, item: IssueInput): Promise<Result<IssueWriteItemResult>> {
  try {
    const res = await prisma.$transaction(async (tx) => {
    const oldIssueId = normalizeBigInt(oldItem.id);
    const existing =
      oldIssueId !== null
        ? await tx.issue.findUnique({
            where: {
              id: oldIssueId,
            },
          })
        : null;

    let resolvedExisting = existing;

    if (!resolvedExisting) {
      const oldPublisher = await findPublisher(oldItem.series?.publisher, tx);
      if (!oldPublisher) throw new Error("Publisher not found");

      const oldSeries = await tx.series.findFirst({
        where: {
          title: normalizeText(oldItem.series?.title),
          volume: BigInt(Number(oldItem.series?.volume ?? 0)),
          fkPublisher: oldPublisher.id,
        },
      });
      if (!oldSeries) throw new Error("Series not found");

      const resolvedExistingMatch = await findIssueBySeriesIdentity(
        {
          fkSeries: oldSeries.id,
          number: oldItem.number,
          format: oldItem.format,
          variant: oldItem.variant,
        },
        tx
      );
      resolvedExisting =
        resolvedExistingMatch?.id != null
          ? await tx.issue.findUnique({
              where: {
                id: resolvedExistingMatch.id,
              },
            })
          : null;
    }
    if (!resolvedExisting) throw new Error("Issue not found");
    const oldSeriesId = resolvedExisting.fkSeries;
    if (oldSeriesId === null || oldSeriesId === undefined) throw new Error("Series not found");
    const inheritsStories = await issueInheritsStories(resolvedExisting.id, tx);

    const newPublisher = await findPublisher(item.series?.publisher, tx);
    if (!newPublisher) throw new Error("Publisher not found");

    const { series: newSeries, created: createdSeries } = await findOrCreateIssueSeries(
      item.series,
      newPublisher.id,
      tx
    );

    const duplicateIssue = await findIssueBySeriesIdentity(
      {
        fkSeries: newSeries.id,
        number: item.number,
        format: item.format,
        variant: item.variant,
        excludeId: resolvedExisting.id,
      },
      tx
    );
    if (duplicateIssue) {
      throw new Error("Issue already exists");
    }

    const oldNumber = normalizeText(oldItem.number);
    const seriesChanged = oldSeriesId !== newSeries.id;
    const siblingIssuesToMove = seriesChanged
      ? await tx.issue.findMany({
          where: {
            number: oldNumber,
            fkSeries: oldSeriesId,
          },
        })
      : [];

    const updated = await tx.issue.update({
      where: {
        id: resolvedExisting.id,
      },
      data: {
        title: inheritsStories ? resolvedExisting.title : normalizeText(item.title),
        number: normalizeText(item.number),
        format: normalizeText(item.format),
        variant: normalizeOptionalText(item.variant),
        releaseDate: coerceReleaseDateForDb(item.releasedate),
        legacyNumber: normalizeText(item.legacy_number),
        pages: normalizeBigInt(item.pages) ?? BigInt(0),
        price: normalizeFloat(item.price),
        currency: normalizeOptionalText(item.currency) ?? "",
        isbn: normalizeOptionalText(item.isbn) ?? "",
        limitation: normalizeBigInt(item.limitation),
        addInfo: normalizeOptionalText(item.addinfo) ?? "",
        fkSeries: newSeries.id,
        updatedAt: new Date(),
        ...(typeof item.verified === "boolean" ? { verified: item.verified } : {}),
        ...(typeof item.collected === "boolean" ? { collected: item.collected } : {}),
        ...(item.comicguideid !== undefined
          ? { comicGuideId: normalizeBigInt(item.comicguideid) }
          : {}),
      },
      include: {
        series: {
          include: {
            publisher: true,
          },
        },
      },
    });

    if (seriesChanged) {
      for (const siblingIssue of siblingIssuesToMove) {
        if (siblingIssue.id === updated.id) continue;
        await tx.issue.update({
          where: { id: siblingIssue.id },
          data: { fkSeries: newSeries.id, updatedAt: new Date() },
        });
      }
    }

    const shouldSyncStories =
      typeof item === "object" && item !== null && Object.prototype.hasOwnProperty.call(item, "stories");

    if (!inheritsStories && !newPublisher.original && shouldSyncStories) {
      const removedUsParentStoryIds = await syncStoriesFromParentRefs(Number(updated.id), item, tx);
      await updateStoryFilterFlagsForIssue(Number(updated.id));
      const removedUsIssueIds = await resolveIssueIdsFromStoryIds(removedUsParentStoryIds, tx);
      for (const removedUsIssueId of removedUsIssueIds) {
        await updateStoryFilterFlagsForIssue(removedUsIssueId);
      }
    }

    return {
      item: toIssuePayload(updated),
      ...(createdSeries ? { meta: { createdSeries: toIssueSeriesMeta(newSeries) } } : {}),
    };
    }, ISSUE_TRANSACTION_OPTIONS);
    return success(res);
  } catch (error) {
    return failure(error as Error);
  }
}

export async function deleteIssueByLookup(item: IssueInput, executor: PrismaExecutor = prisma): Promise<Result<boolean>> {
  try {
    const runDelete = async (tx: PrismaExecutor) => {
    const publisher = await tx.publisher.findFirst({
      where: {
        name: normalizeText(item.series?.publisher?.name),
        ...(typeof item.series?.publisher?.us === "boolean"
          ? { original: item.series.publisher.us }
          : {}),
      },
    });
    if (!publisher) throw new Error("Publisher not found");

    const series = await tx.series.findFirst({
      where: {
        title: normalizeText(item.series?.title),
        volume: BigInt(Number(item.series?.volume ?? 0)),
        fkPublisher: publisher.id,
      },
    });
    if (!series) throw new Error("Series not found");

    const issueMatch = await findIssueBySeriesIdentity(
      {
        fkSeries: series.id,
        number: item.number,
        format: item.format,
        variant: item.variant,
      },
      tx
    );
    const issue =
      issueMatch?.id != null
        ? await tx.issue.findUnique({
            where: {
              id: issueMatch.id,
            },
          })
        : null;
    if (!issue) throw new Error("Issue not found");

    const storyRows = await tx.story.findMany({
      where: {
        fkIssue: issue.id,
      },
      select: {
        id: true,
      },
    });
    const storyIds = storyRows.map((entry) => entry.id);

    const coverRows = await tx.cover.findMany({
      where: {
        fkIssue: issue.id,
      },
      select: {
        id: true,
      },
    });
    const coverIds = coverRows.map((entry) => entry.id);

    if (storyIds.length > 0) {
      await tx.story.updateMany({
        where: {
          fkParent: {
            in: storyIds,
          },
        },
        data: {
          fkParent: null,
        },
      });

      await tx.story.updateMany({
        where: {
          fkReprint: {
            in: storyIds,
          },
        },
        data: {
          fkReprint: null,
        },
      });

      await tx.storyAppearance.deleteMany({
        where: {
          fkStory: {
            in: storyIds,
          },
        },
      });

      await tx.storyIndividual.deleteMany({
        where: {
          fkStory: {
            in: storyIds,
          },
        },
      });

      await tx.story.deleteMany({
        where: {
          id: {
            in: storyIds,
          },
        },
      });
    }

    if (coverIds.length > 0) {
      await tx.cover.updateMany({
        where: {
          fkParent: {
            in: coverIds,
          },
        },
        data: {
          fkParent: null,
        },
      });

      await tx.coverIndividual.deleteMany({
        where: {
          fkCover: {
            in: coverIds,
          },
        },
      });

      await tx.cover.deleteMany({
        where: {
          id: {
            in: coverIds,
          },
        },
      });
    }

    await tx.issueArc.deleteMany({
      where: {
        fkIssue: issue.id,
      },
    });

    await tx.issueIndividual.deleteMany({
      where: {
        fkIssue: issue.id,
      },
    });

    await tx.changeRequest.deleteMany({
      where: {
        fkIssue: Number(issue.id),
      },
    });

    await tx.issue.delete({
      where: {
        id: issue.id,
      },
    });
  };

  if (executor === prisma) {
      await prisma.$transaction(async (tx) => {
        await runDelete(tx);
      });
    } else {
      await runDelete(executor);
    }

    return success(true);
  } catch (error) {
    return failure(error as Error);
  }
}

async function createIssueRecord(item: IssueInput, tx: PrismaExecutor) {
  const publisher = await findPublisher(item.series?.publisher, tx);
  if (!publisher) throw new Error("Publisher not found");

  const { series, created: createdSeries } = await findOrCreateIssueSeries(item.series, publisher.id, tx);

  const duplicateIssue = await findIssueBySeriesIdentity(
    {
      fkSeries: series.id,
      number: item.number,
      format: item.format,
      variant: item.variant,
    },
    tx
  );
  if (duplicateIssue) {
    throw new Error("Issue already exists");
  }

  const now = new Date();
  const created = await tx.issue.create({
    data: {
      title: normalizeText(item.title),
      number: normalizeText(item.number),
      format: normalizeText(item.format),
      variant: normalizeOptionalText(item.variant),
      releaseDate: coerceReleaseDateForDb(item.releasedate),
      legacyNumber: normalizeText(item.legacy_number),
      pages: normalizeBigInt(item.pages),
      price: normalizeFloat(item.price),
      currency: normalizeOptionalText(item.currency),
      comicGuideId: normalizeBigInt(item.comicguideid),
      fkSeries: series.id,
      isbn: normalizeOptionalText(item.isbn),
      limitation: normalizeBigInt(item.limitation),
      addInfo: normalizeOptionalText(item.addinfo),
      verified: Boolean(item.verified),
      collected: typeof item.collected === "boolean" ? item.collected : null,
      createdAt: now,
      updatedAt: now,
    },
    include: {
      series: {
        include: {
          publisher: true,
        },
      },
    },
  });

  await syncStoriesFromParentRefs(Number(created.id), item, tx);
  await updateStoryFilterFlagsForIssue(Number(created.id));

  return {
    item: toIssuePayload(created),
    ...(createdSeries ? { meta: { createdSeries: toIssueSeriesMeta(series) } } : {}),
  };
}

async function syncStoriesFromParentRefs(
  issueId: number,
  item: IssueInput,
  executor: PrismaExecutor
) {
  const inputStories = Array.isArray(item.stories) ? item.stories : [];

  const existingStories = await executor.story.findMany({
    where: { fkIssue: BigInt(issueId) },
    orderBy: [{ number: "asc" }, { id: "asc" }],
    select: { id: true, fkParent: true },
  });

  const oldParentStoryIds = existingStories
    .map((story) => Number(story.fkParent || 0))
    .filter((id) => id > 0);
  const oldUsParentStoryIds = await filterUsParentStoryIds(oldParentStoryIds, executor);
  const newlyLinkedParentStoryIds = new Set<number>();
  const existingStoryIds = existingStories.map((story) => story.id);

  if (existingStoryIds.length > 0) {
    await executor.storyAppearance.deleteMany({
      where: { fkStory: { in: existingStoryIds } },
    });
    await executor.storyIndividual.deleteMany({
      where: { fkStory: { in: existingStoryIds } },
    });
    await executor.story.deleteMany({
      where: { id: { in: existingStoryIds } },
    });
  }

  if (inputStories.length === 0) {
    return Array.from(oldUsParentStoryIds);
  }

  const parentIssueCache = new Map<string, ParentIssueRef[]>();
  let nextStoryNumber = 1;

  for (const story of inputStories) {
    const requestedStoryNumber = Number(story.number || 0);
    const resolvedStoryNumber = requestedStoryNumber > 0 ? requestedStoryNumber : nextStoryNumber++;
    if (resolvedStoryNumber >= nextStoryNumber) nextStoryNumber = resolvedStoryNumber + 1;

    const createStoryRow = async (parentStoryId: number | null) => {
      if (typeof parentStoryId === "number" && parentStoryId > 0) {
        newlyLinkedParentStoryIds.add(parentStoryId);
      }

      const createdStory = await executor.story.create({
        data: {
          fkIssue: BigInt(issueId),
          fkParent: parentStoryId ? BigInt(parentStoryId) : null,
          number: BigInt(resolvedStoryNumber),
          title: normalizeText(story.title),
          addInfo: normalizeText(story.addinfo),
          part: normalizeText(story.part),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await linkStoryIndividuals(Number(createdStory.id), story.individuals || [], executor);
      await linkStoryAppearances(Number(createdStory.id), story.appearances || [], executor);
    };

    let hasCreatedStory = false;
      const parentTitle = normalizeText(story.parent?.issue?.series?.title);
    const parentVolume = Number(story.parent?.issue?.series?.volume || 0);
    const parentNumber = normalizeText(story.parent?.issue?.number);

    if (parentTitle && parentVolume > 0 && parentNumber) {
      const cacheKey = `${parentTitle}::${parentVolume}::${parentNumber}`;
      let parentIssueRefs = parentIssueCache.get(cacheKey);

      if (!parentIssueRefs) {
        parentIssueRefs = await findOrCrawlParentIssueRefs(
          {
            title: parentTitle,
            volume: parentVolume,
            number: parentNumber,
          },
          executor
        );
        parentIssueCache.set(cacheKey, parentIssueRefs);
      }

      if (parentIssueRefs.length > 0) {
        const requestedParentStoryNumber = Number(story.parent?.number || 0);
        const requestedStoryTitle = normalizeStoryTitleKey(story.title);
        const matchedParentRefsByTitle =
          requestedStoryTitle === ""
            ? []
            : parentIssueRefs.filter(
                (entry) => normalizeStoryTitleKey(entry.storyTitle) === requestedStoryTitle
              );

        const parentIssueIds = parentIssueRefs.map((entry) => entry.issueId);
        const parentStories = await executor.story.findMany({
          where: {
            fkIssue: { in: parentIssueIds },
            ...(requestedParentStoryNumber > 0
              ? { number: BigInt(requestedParentStoryNumber) }
              : {}),
          },
          orderBy: [{ fkIssue: "asc" }, { number: "asc" }, { id: "asc" }],
          select: { id: true, fkIssue: true, title: true, number: true },
        });

        const matchesResolvedParentStory = (parentStory: {
          fkIssue: bigint | null;
          title: string;
        }) =>
          matchedParentRefsByTitle.some(
            (entry) =>
              entry.issueId === parentStory.fkIssue &&
              normalizeStoryTitleKey(entry.storyTitle) === normalizeStoryTitleKey(parentStory.title)
          );

        let selectedParentStories = parentStories;
        if (requestedParentStoryNumber > 0) {
          selectedParentStories = parentStories.filter(
            (entry) =>
              Number(entry.number || 0) === requestedParentStoryNumber &&
              (matchedParentRefsByTitle.length === 0 || matchesResolvedParentStory(entry))
          );
        } else if (matchedParentRefsByTitle.length > 0) {
          selectedParentStories = parentStories.filter((entry) => matchesResolvedParentStory(entry));
        }

        for (const parentStory of selectedParentStories) {
          await createStoryRow(Number(parentStory.id));
          hasCreatedStory = true;
        }
      }
    }

    if (!hasCreatedStory) {
      await createStoryRow(null);
    }
  }

  return Array.from(oldUsParentStoryIds).filter((id) => !newlyLinkedParentStoryIds.has(id));
}

async function filterUsParentStoryIds(storyIds: readonly number[], executor: PrismaExecutor) {
  const numericStoryIds = normalizeDbIds(storyIds);
  if (numericStoryIds.length === 0) return new Set<number>();

  const stories = await executor.story.findMany({
    where: { id: { in: numericStoryIds.map(BigInt) } },
    select: {
      id: true,
      issue: {
        select: {
          series: {
            select: {
              publisher: {
                select: {
                  original: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const usStoryIds = new Set<number>();
  for (const story of stories) {
    if (!story.issue?.series?.publisher?.original) continue;
    const storyId = Number(story.id || 0);
    if (storyId > 0) usStoryIds.add(storyId);
  }

  return usStoryIds;
}

async function resolveIssueIdsFromStoryIds(storyIds: readonly number[], executor: PrismaExecutor) {
  const numericStoryIds = normalizeDbIds(storyIds);
  if (numericStoryIds.length === 0) return [];

  const stories = await executor.story.findMany({
    where: { id: { in: numericStoryIds.map(BigInt) } },
    select: { fkIssue: true },
  });

  return Array.from(
    new Set(stories.map((story) => Number(story.fkIssue || 0)).filter((id) => id > 0))
  );
}

async function findOrCrawlParentIssueRefs(
  parent: { title: string; volume: number; number: string },
  executor: PrismaExecutor
): Promise<ParentIssueRef[]> {
  const localIssues = await executor.issue.findMany({
    where: {
      number: parent.number,
      variant: "",
      series: {
        title: parent.title,
        volume: BigInt(parent.volume),
        publisher: {
          original: true,
        },
      },
    },
    orderBy: [{ id: "asc" }],
    select: { id: true },
  });

  if (localIssues.length > 0) {
    return localIssues.map((entry) => ({ issueId: entry.id }));
  }

  const crawledSeries = await crawler.crawlSeries(parent.title, parent.volume);
  let publisher = await executor.publisher.findFirst({
    where: {
      name: normalizeText(crawledSeries.publisherName) || "Marvel Comics",
      original: true,
    },
  });

  if (!publisher) {
    publisher = await executor.publisher.create({
      data: {
        name: normalizeText(crawledSeries.publisherName) || "Marvel Comics",
        original: true,
        addInfo: "",
        startYear: BigInt(0),
        endYear: BigInt(0),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  let series = await executor.series.findFirst({
    where: {
      title: parent.title,
      volume: BigInt(parent.volume),
      fkPublisher: publisher.id,
    },
  });

  if (!series) {
    series = await executor.series.create({
      data: {
        title: crawledSeries.title,
        volume: BigInt(crawledSeries.volume),
        startYear: BigInt(crawledSeries.startyear || 0),
        endYear: BigInt(crawledSeries.endyear || 0),
        addInfo: "",
        fkPublisher: publisher.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  const issue = await executor.issue.findFirst({
    where: {
      number: parent.number,
      variant: "",
      fkSeries: series.id,
    },
    select: { id: true },
  });
  if (issue) return [{ issueId: issue.id }];

  const crawledIssue = (await crawler.crawlIssue(
    parent.title,
    parent.volume,
    parent.number
  )) as CrawledIssueLike;

  let normalizedCollectedIssues: Array<{
    number: string;
    storyTitle: string;
    seriesTitle: string;
    seriesVolume: number;
  }> = [];
  if (Array.isArray(crawledIssue.collectedIssues)) {
    normalizedCollectedIssues = crawledIssue.collectedIssues
      .map((entry) => ({
        number: normalizeText(entry?.number),
        storyTitle: normalizeText(entry?.storyTitle),
        seriesTitle: normalizeText(entry?.series?.title),
        seriesVolume: Number(entry?.series?.volume || 0),
      }))
      .filter((entry) => entry.number && entry.seriesTitle && entry.seriesVolume > 0);
  } else if (Array.isArray(crawledIssue.containedIssues)) {
    normalizedCollectedIssues = crawledIssue.containedIssues
      .map((entry) => ({
        number: normalizeText(entry?.number),
        storyTitle: normalizeText(entry?.storyTitle),
        seriesTitle: normalizeText(entry?.series?.title),
        seriesVolume: Number(entry?.series?.volume || 0),
      }))
      .filter((entry) => entry.number && entry.seriesTitle && entry.seriesVolume > 0);
  }

  if (normalizedCollectedIssues.length > 0) {
    const containedIssueRefs = new Map<string, ParentIssueRef>();
    for (const containedIssue of normalizedCollectedIssues) {
      const refs = await findOrCrawlParentIssueRefs(
        {
          title: containedIssue.seriesTitle,
          volume: containedIssue.seriesVolume,
          number: containedIssue.number,
        },
        executor
      );
      refs.forEach((ref) => {
        const key = `${String(ref.issueId)}::${normalizeStoryTitleKey(containedIssue.storyTitle || ref.storyTitle)}`;
        containedIssueRefs.set(key, {
          issueId: ref.issueId,
          storyTitle: containedIssue.storyTitle || ref.storyTitle,
        });
      });
    }
    if (containedIssueRefs.size > 0) return Array.from(containedIssueRefs.values());
  }

  const createdIssue = await executor.issue.create({
    data: {
      title: "",
      number: parent.number,
      format: "Heft",
      variant: "",
      releaseDate: coerceReleaseDateForDb(crawledIssue.releasedate),
      legacyNumber: normalizeText(crawledIssue.legacyNumber),
      pages: BigInt(0),
      price: normalizeFloat(crawledIssue.price),
      currency: normalizeOptionalText(crawledIssue.currency) ?? "USD",
      comicGuideId: BigInt(0),
      isbn: "",
      limitation: null,
      addInfo: "",
      fkSeries: series.id,
      verified: false,
      collected: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const mainCover = crawledIssue.cover || {
    number: 0,
    url: "",
    individuals: [],
  };

  const createdMainCover = await executor.cover.create({
    data: {
      fkIssue: createdIssue.id,
      fkParent: null,
      number: BigInt(Number(mainCover.number || 0)),
      url: normalizeOptionalText(mainCover.url) ?? "",
      addInfo: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await linkCoverIndividuals(createdMainCover.id, mainCover.individuals || [], executor);
  await linkIssueIndividuals(createdIssue.id, crawledIssue.individuals || [], executor);
  await linkIssueArcs(createdIssue.id, crawledIssue.arcs || [], executor);

  for (const crawledStory of crawledIssue.stories || []) {
    const createdStory = await executor.story.create({
      data: {
        fkIssue: createdIssue.id,
        number: BigInt(Number(crawledStory.number || 0) || 1),
        title: normalizeText(crawledStory.title),
        addInfo: normalizeText(crawledStory.addinfo),
        part: normalizeText(crawledStory.part),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    await linkStoryIndividuals(Number(createdStory.id), crawledStory.individuals || [], executor);
    await linkStoryAppearances(Number(createdStory.id), crawledStory.appearances || [], executor);
  }

  for (const crawledVariant of crawledIssue.variants || []) {
    const variantNumber = normalizeText(crawledVariant.number || createdIssue.number || parent.number);
    const variantName = normalizeText(crawledVariant.variant);
    if (!variantName) continue;

    const variantFormat = normalizeText(crawledVariant.format || "Heft");
    const existingVariantIssue = await executor.issue.findFirst({
      where: {
        fkSeries: series.id,
        number: variantNumber,
        format: variantFormat,
        variant: variantName,
      },
    });

    const variantIssue = existingVariantIssue
      ? await executor.issue.update({
          where: {
            id: existingVariantIssue.id,
          },
          data: {
            releaseDate: coerceReleaseDateForDb(
              crawledVariant.releasedate || crawledIssue.releasedate || ""
            ),
            legacyNumber: normalizeText(crawledVariant.legacyNumber || crawledIssue.legacyNumber),
            price: normalizeFloat(crawledVariant.price),
            currency: normalizeOptionalText(crawledVariant.currency || crawledIssue.currency) ?? "USD",
            updatedAt: new Date(),
          },
        })
      : await executor.issue.create({
          data: {
            title: "",
            number: variantNumber,
            format: variantFormat,
            variant: variantName,
            releaseDate: coerceReleaseDateForDb(
              crawledVariant.releasedate || crawledIssue.releasedate || ""
            ),
            legacyNumber: normalizeText(crawledVariant.legacyNumber || crawledIssue.legacyNumber),
            pages: BigInt(0),
            price: normalizeFloat(crawledVariant.price),
            currency: normalizeOptionalText(crawledVariant.currency || crawledIssue.currency) ?? "USD",
            comicGuideId: BigInt(0),
            isbn: "",
            limitation: null,
            addInfo: "",
            fkSeries: series.id,
            verified: false,
            collected: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

    const variantCover = crawledVariant.cover;
    if (!variantCover) continue;

    const createdVariantCover = await executor.cover.create({
      data: {
        fkIssue: variantIssue.id,
        fkParent: null,
        number: BigInt(Number(variantCover.number || 0)),
        url: normalizeOptionalText(variantCover.url) ?? "",
        addInfo: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await linkCoverIndividuals(createdVariantCover.id, variantCover.individuals || [], executor);
  }

  return [{ issueId: createdIssue.id }];
}

async function findPublisher(publisher: PublisherRef | null | undefined, executor: PrismaExecutor) {
  return executor.publisher.findFirst({
    where: {
      name: normalizeText(publisher?.name),
      ...(typeof publisher?.us === "boolean" ? { original: publisher.us } : {}),
    },
  });
}

async function findOrCreateIssueSeries(
  seriesInput: IssueInput["series"],
  publisherId: bigint,
  executor: PrismaExecutor
) {
  const title = normalizeText(seriesInput?.title);
  const volume = BigInt(Number(seriesInput?.volume ?? 0));

  let series = await executor.series.findFirst({
    where: {
      title,
      volume,
      fkPublisher: publisherId,
    },
    include: {
      publisher: true,
    },
  });

  if (series) {
    return {
      series,
      created: false,
    };
  }

  const currentYear = new Date().getFullYear();
  series = await executor.series.create({
    data: {
      title,
      volume,
      startYear: BigInt(currentYear),
      endYear: BigInt(0),
      genre: "",
      addInfo: "",
      fkPublisher: publisherId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    include: {
      publisher: true,
    },
  });

  return {
    series,
    created: true,
  };
}

function toIssueSeriesMeta(series: {
  title: string | null;
  volume: bigint;
  startYear: bigint;
  endYear: bigint | null;
  publisher: {
    name: string;
    original: boolean;
  } | null;
}): IssueSeriesMeta {
  return {
    title: series.title || "",
    volume: Number(series.volume),
    startyear: Number(series.startYear),
    endyear: series.endYear === null ? 0 : Number(series.endYear),
    publisher: series.publisher
      ? {
          name: series.publisher.name,
          us: series.publisher.original,
        }
      : undefined,
  };
}

function toIssuePayload(issue: {
  id: bigint;
  title: string;
  number: string;
  format: string;
  variant: string | null;
  releaseDate: Date | null;
  pages: bigint | null;
  price: number | null;
  currency: string | null;
  comicGuideId: bigint | null;
  isbn: string | null;
  limitation: bigint | null;
  addInfo: string | null;
  verified: boolean;
  collected: boolean | null;
  series: {
    id: bigint;
    title: string | null;
    volume: bigint;
    publisher: {
      id: bigint;
      name: string;
      original: boolean;
    } | null;
  } | null;
}) {
  return {
    id: String(issue.id),
    title: issue.title || "",
    number: issue.number || "",
    format: issue.format || "",
    variant: issue.variant || "",
    releasedate: issue.releaseDate ? issue.releaseDate.toISOString().slice(0, 10) : "",
    pages: issue.pages === null ? 0 : Number(issue.pages),
    price: issue.price ?? 0,
    currency: issue.currency || "",
    comicguideid: issue.comicGuideId === null ? 0 : Number(issue.comicGuideId),
    isbn: issue.isbn || "",
    limitation: issue.limitation === null ? "" : String(issue.limitation),
    addinfo: issue.addInfo || "",
    verified: issue.verified,
    collected: issue.collected ?? false,
    series: issue.series
      ? {
          id: String(issue.series.id),
          title: issue.series.title || "",
          volume: Number(issue.series.volume),
          publisher: issue.series.publisher
            ? {
                id: String(issue.series.publisher.id),
                name: issue.series.publisher.name,
                us: issue.series.publisher.original,
              }
            : undefined,
        }
      : undefined,
  };
}

async function findIssueBySeriesIdentity(
  input: {
    fkSeries: bigint;
    number?: string | null;
    format?: string | null;
    variant?: string | null;
    excludeId?: bigint;
  },
  executor: PrismaExecutor
) {
  const normalizedNumber = normalizeText(input.number);
  const normalizedFormat = normalizeText(input.format);
  const normalizedVariant = normalizeOptionalText(input.variant);

  return executor.issue.findFirst({
    where: {
      fkSeries: input.fkSeries,
      number: normalizedNumber,
      format: normalizedFormat,
      ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
      ...(normalizedVariant
        ? { variant: normalizedVariant }
        : {
            OR: [{ variant: null }, { variant: "" }],
          }),
    },
    select: { id: true },
  });
}

async function issueInheritsStories(issueId: bigint, executor: PrismaExecutor) {
  const ownStory = await executor.story.findFirst({
    where: {
      fkIssue: issueId,
    },
    select: { id: true },
  });
  if (ownStory) return false;

  const issue = await executor.issue.findUnique({
    where: {
      id: issueId,
    },
    select: {
      id: true,
      fkSeries: true,
      number: true,
    },
  });
  if (!issue?.fkSeries) return false;

  const siblingWithStories = await executor.issue.findFirst({
    where: {
      fkSeries: issue.fkSeries,
      number: issue.number,
      NOT: { id: issue.id },
      stories: {
        some: {},
      },
    },
    select: { id: true },
  });

  return Boolean(siblingWithStories);
}
