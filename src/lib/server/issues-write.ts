import type { PrismaClient, Prisma } from "@prisma/client";
import "server-only";

import { prisma } from "../prisma/client";
import { handleIssueWriteEffects, recalculateCollectionFlagsForIssues } from "./issue-materialize-write";
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

type ParentIssueCache = Map<string, ParentIssueRef[]>;

type ParentIssueLookup = {
  title: string;
  volume: number;
  number: string;
};

type CrawledSeriesSnapshot = {
  publisherName?: string;
  title: string;
  volume: number;
  startyear?: number;
  endyear?: number;
};

type ParentIssueResolution =
  | {
      kind: "refs";
      refs: ParentIssueRef[];
    }
  | {
      kind: "contained";
      items: Array<{
        lookup: ParentIssueLookup;
        storyTitle?: string;
      }>;
    }
  | {
      kind: "issue";
      crawledSeries: CrawledSeriesSnapshot;
      crawledIssue: CrawledIssueLike;
    };

type ParentIssuePreflightCache = Map<string, Promise<ParentIssueResolution>>;

type IssueInput = {
  id?: string | number | null;
  variantId?: string | number | null;
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
    const preflightCache = await prepareParentIssuePreflight(item);
    const res = await prisma.$transaction(async (tx) => {
      const result = await createIssueRecord(item, tx, undefined, preflightCache);
      await handleIssueWriteEffects(BigInt(result.item.id), tx);
      return result;
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
    const preflightCache = await prepareParentIssuePreflight(item);
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
          tx,
          undefined,
          preflightCache
        );
        createdItems.push(createdResult.item);
        if (!meta?.createdSeries && createdResult.meta?.createdSeries) {
          meta = createdResult.meta;
        }
      }

      const createdIssueIds = Array.from(new Set(createdItems.map(i => BigInt(i.id))));
      for (const id of createdIssueIds) {
        await handleIssueWriteEffects(id, tx);
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

export async function editIssue(item: IssueInput): Promise<Result<IssueWriteItemResult>> {
  try {
    const preflightCache = await prepareParentIssuePreflight(item);
    const res = await prisma.$transaction(async (tx) => {
      const resolvedExisting = await resolveExistingIssueForEdit(item, tx);
      if (resolvedExisting == null) throw new Error("Issue not found");

      const newPublisher = await findPublisher(item.series?.publisher, tx);
      if (newPublisher == null) throw new Error("Publisher not found");

      const { series: newSeries, created: createdSeries } = await findOrCreateIssueSeries(
        item.series,
        newPublisher.id,
        tx
      );

      // Find the specific Variant we are editing
      let existingVariant = null;
      const variantId = normalizeBigInt(item.variantId);
      if (variantId != null) {
        existingVariant = await tx.variant.findUnique({
          where: { id: variantId },
        });
      }

      if (!existingVariant) {
        existingVariant = await tx.variant.findFirst({
          where: {
            fkIssue: resolvedExisting.id,
            format: normalizeText(item.format),
            variantLabel: normalizeOptionalText(item.variant),
          },
        });
      }

      if (!existingVariant) {
        const variants = await tx.variant.findMany({
          where: { fkIssue: resolvedExisting.id },
        });
        if (variants.length === 1) {
          existingVariant = variants[0];
        }
      }

      if (!existingVariant) throw new Error("Variant not found");

      // Check if another issue already exists with the target series/number combination
      const targetIssue = await tx.issue.findFirst({
        where: {
          fkSeries: newSeries.id,
          number: normalizeText(item.number),
        },
      });

      let updatedIssue;
      let updatedVariant;

      if (targetIssue && targetIssue.id !== resolvedExisting.id) {
        // CONFLICT PATH: Re-parent the variant to targetIssue

        // 1. Verify that the updated format/label doesn't duplicate a variant already present on targetIssue
        const duplicateVariantInTarget = await tx.variant.findFirst({
          where: {
            fkIssue: targetIssue.id,
            format: normalizeText(item.format),
            variantLabel: normalizeOptionalText(item.variant) || null,
          },
        });
        if (duplicateVariantInTarget) {
          throw new Error("Variant already exists in target issue");
        }

        // 2. Update and re-parent the Variant
        updatedVariant = await tx.variant.update({
          where: {
            id: existingVariant.id,
          },
          data: {
            fkIssue: targetIssue.id,
            format: normalizeText(item.format),
            variantLabel: normalizeOptionalText(item.variant),
            releaseDate: coerceReleaseDateForDb(item.releasedate),
            pages: normalizeBigInt(item.pages) ?? BigInt(0),
            price: normalizeFloat(item.price),
            currency: normalizeOptionalText(item.currency) ?? "",
            isbn: normalizeOptionalText(item.isbn) ?? "",
            limitation: normalizeBigInt(item.limitation),
            addInfo: normalizeOptionalText(item.addinfo) ?? "",
            updatedAt: new Date(),
            ...(typeof item.verified === "boolean" ? { verified: item.verified } : {}),
            ...(typeof item.collected === "boolean" ? { collected: item.collected } : {}),
            ...(item.comicguideid === undefined
              ? {}
              : { comicGuideId: normalizeBigInt(item.comicguideid) }),
          },
        });

        // 3. Update targetIssue properties (title, legacyNumber, etc.)
        updatedIssue = await tx.issue.update({
          where: {
            id: targetIssue.id,
          },
          data: {
            title: normalizeText(item.title),
            legacyNumber: normalizeText(item.legacy_number),
            updatedAt: new Date(),
          },
          include: {
            series: {
              include: {
                publisher: true,
              },
            },
          },
        });

        // 4. Clean up original issue if no variants are left
        const originalVariantsCount = await tx.variant.count({
          where: {
            fkIssue: resolvedExisting.id,
          },
        });

        if (originalVariantsCount === 0) {
          const storiesForDeletion = await tx.story.findMany({
            where: { fkIssue: resolvedExisting.id },
            select: { id: true, fkParent: true },
          });
          const parentIdsForDeletion = storiesForDeletion
            .map(s => s.fkParent)
            .filter((id): id is bigint => id != null);
          const ownStoryIdsForDeletion = storiesForDeletion.map(s => s.id);
          const fkSeriesForDeletion = resolvedExisting.fkSeries;
          const numberForDeletion = resolvedExisting.number;

          const affectedIssuesForDeletion = await tx.issue.findMany({
            where: {
              series: { publisher: { original: false } },
              id: { not: resolvedExisting.id },
              OR: [
                ...(fkSeriesForDeletion !== null ? [{ fkSeries: fkSeriesForDeletion, number: numberForDeletion }] : []),
                ...(parentIdsForDeletion.length > 0 || ownStoryIdsForDeletion.length > 0
                  ? [
                      {
                        stories: {
                          some: {
                            fkParent: { in: [...parentIdsForDeletion, ...ownStoryIdsForDeletion] },
                          },
                        },
                      },
                    ]
                  : []),
              ],
            },
            select: { id: true },
          });
          const affectedIssueIdsForDeletion = Array.from(new Set(affectedIssuesForDeletion.map(i => i.id)));

          const storyRows = await tx.story.findMany({
            where: {
              fkIssue: resolvedExisting.id,
            },
            select: {
              id: true,
            },
          });
          const storyIds = storyRows.map((entry) => entry.id);

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

          await tx.issueArc.deleteMany({
            where: {
              fkIssue: resolvedExisting.id,
            },
          });

          await tx.issueIndividual.deleteMany({
            where: {
              fkIssue: resolvedExisting.id,
            },
          });

          await tx.changeRequest.deleteMany({
            where: {
              fkIssue: Number(resolvedExisting.id),
            },
          });

          await tx.issue.delete({
            where: {
              id: resolvedExisting.id,
            },
          });

          if (affectedIssueIdsForDeletion.length > 0) {
            await recalculateCollectionFlagsForIssues(affectedIssueIdsForDeletion, tx);
          }
        } else {
          // If original issue is not deleted, recalculate its write effects
          await handleIssueWriteEffects(resolvedExisting.id, tx);
        }

      } else {
        // NON-CONFLICT PATH: Standard update

        // Verify new identity won't duplicate another variant outside this parent issue
        await assertIssueSeriesIdentityIsAvailable(
          {
            fkSeries: newSeries.id,
            number: item.number,
            format: item.format,
            variant: item.variant,
            excludeId: resolvedExisting.id,
          },
          tx
        );

        // Verify it doesn't duplicate another variant inside this parent issue
        const duplicateVariantInSameIssue = await tx.variant.findFirst({
          where: {
            fkIssue: resolvedExisting.id,
            format: normalizeText(item.format),
            variantLabel: normalizeOptionalText(item.variant) || null,
            NOT: {
              id: existingVariant.id,
            },
          },
        });
        if (duplicateVariantInSameIssue) {
          throw new Error("Variant already exists in this issue");
        }

        // Update Issue
        updatedIssue = await tx.issue.update({
          where: {
            id: resolvedExisting.id,
          },
          data: {
            title: normalizeText(item.title),
            number: normalizeText(item.number),
            legacyNumber: normalizeText(item.legacy_number),
            fkSeries: newSeries.id,
            updatedAt: new Date(),
          },
          include: {
            series: {
              include: {
                publisher: true,
              },
            },
          },
        });

        // Update Variant
        updatedVariant = await tx.variant.update({
          where: {
            id: existingVariant.id,
          },
          data: {
            format: normalizeText(item.format),
            variantLabel: normalizeOptionalText(item.variant),
            releaseDate: coerceReleaseDateForDb(item.releasedate),
            pages: normalizeBigInt(item.pages) ?? BigInt(0),
            price: normalizeFloat(item.price),
            currency: normalizeOptionalText(item.currency) ?? "",
            isbn: normalizeOptionalText(item.isbn) ?? "",
            limitation: normalizeBigInt(item.limitation),
            addInfo: normalizeOptionalText(item.addinfo) ?? "",
            updatedAt: new Date(),
            ...(typeof item.verified === "boolean" ? { verified: item.verified } : {}),
            ...(typeof item.collected === "boolean" ? { collected: item.collected } : {}),
            ...(item.comicguideid === undefined
              ? {}
              : { comicGuideId: normalizeBigInt(item.comicguideid) }),
          },
        });
      }

      if (shouldSyncIssueStories(item, newPublisher.original)) {
        await syncStoriesFromParentRefs(
          Number(updatedIssue.id),
          item,
          tx,
          undefined,
          preflightCache
        );
      }

      await handleIssueWriteEffects(updatedIssue.id, tx);

      return {
        item: toIssuePayload(updatedIssue, updatedVariant),
        ...(createdSeries ? { meta: { createdSeries: toIssueSeriesMeta(newSeries) } } : {}),
      };
    }, ISSUE_TRANSACTION_OPTIONS);
    return success(res);
  } catch (error) {
    return failure(error as Error);
  }
}

async function resolveExistingIssueForEdit(item: IssueInput, executor: PrismaExecutor) {
  const issueId = normalizeBigInt(item.id);
  if (issueId != null) {
    const existingIssue = await executor.issue.findUnique({
      where: {
        id: issueId,
      },
    });
    if (existingIssue) return existingIssue;
  }

  const publisher = await findPublisher(item.series?.publisher, executor);
  if (publisher == null) throw new Error("Publisher not found");

  const series = await executor.series.findFirst({
    where: {
      title: normalizeText(item.series?.title),
      volume: BigInt(Number(item.series?.volume ?? 0)),
      fkPublisher: publisher.id,
    },
  });
  if (series == null) throw new Error("Series not found");

  const resolvedExistingMatch = await findIssueBySeriesIdentity(
    {
      fkSeries: series.id,
      number: item.number,
      format: item.format,
      variant: item.variant,
    },
    executor
  );
  if (resolvedExistingMatch?.id == null) return null;

  return executor.issue.findUnique({
    where: {
      id: resolvedExistingMatch.id,
    },
  });
}

async function assertIssueSeriesIdentityIsAvailable(
  input: {
    fkSeries: bigint;
    number?: string | null;
    format?: string | null;
    variant?: string | null;
    excludeId?: bigint;
  },
  executor: PrismaExecutor
) {
  const duplicateIssue = await findIssueBySeriesIdentity(input, executor);
  if (duplicateIssue) {
    throw new Error("Issue already exists");
  }
}

function shouldSyncIssueStories(item: IssueInput, isUsPublisher: boolean) {
  return !isUsPublisher && Object.hasOwn(item, "stories");
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

      const parentIssue = await tx.issue.findFirst({
        where: {
          fkSeries: series.id,
          number: normalizeText(item.number),
        },
      });
      if (!parentIssue) throw new Error("Issue not found");

      const variant = await tx.variant.findFirst({
        where: {
          fkIssue: parentIssue.id,
          format: normalizeText(item.format),
          variantLabel: normalizeOptionalText(item.variant) || null,
        },
      });
      if (!variant) throw new Error("Variant not found");

      const coverRows = await tx.cover.findMany({
        where: {
          fkVariant: variant.id,
        },
        select: {
          id: true,
        },
      });
      const coverIds = coverRows.map((entry) => entry.id);

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

      const storiesForDeletion = await tx.story.findMany({
        where: { fkIssue: parentIssue.id },
        select: { id: true, fkParent: true },
      });
      const parentIdsForDeletion = storiesForDeletion
        .map(s => s.fkParent)
        .filter((id): id is bigint => id != null);
      const ownStoryIdsForDeletion = storiesForDeletion.map(s => s.id);
      const fkSeriesForDeletion = parentIssue.fkSeries;
      const numberForDeletion = parentIssue.number;

      const affectedIssuesForDeletion = await tx.issue.findMany({
        where: {
          series: { publisher: { original: false } },
          id: { not: parentIssue.id },
          OR: [
            ...(fkSeriesForDeletion !== null ? [{ fkSeries: fkSeriesForDeletion, number: numberForDeletion }] : []),
            ...(parentIdsForDeletion.length > 0 || ownStoryIdsForDeletion.length > 0
              ? [
                  {
                    stories: {
                      some: {
                        fkParent: { in: [...parentIdsForDeletion, ...ownStoryIdsForDeletion] },
                      },
                    },
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });
      const affectedIssueIdsForDeletion = Array.from(new Set(affectedIssuesForDeletion.map(i => i.id)));

      await tx.variant.delete({
        where: {
          id: variant.id,
        },
      });

      const otherVariantsCount = await tx.variant.count({
        where: {
          fkIssue: parentIssue.id,
        },
      });

      if (otherVariantsCount === 0) {
        const storyRows = await tx.story.findMany({
          where: {
            fkIssue: parentIssue.id,
          },
          select: {
            id: true,
          },
        });
        const storyIds = storyRows.map((entry) => entry.id);

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

        await tx.issueArc.deleteMany({
          where: {
            fkIssue: parentIssue.id,
          },
        });

        await tx.issueIndividual.deleteMany({
          where: {
            fkIssue: parentIssue.id,
          },
        });

        await tx.changeRequest.deleteMany({
          where: {
            fkIssue: Number(parentIssue.id),
          },
        });

        await tx.issue.delete({
          where: {
            id: parentIssue.id,
          },
        });

        if (affectedIssueIdsForDeletion.length > 0) {
          await recalculateCollectionFlagsForIssues(affectedIssueIdsForDeletion, tx);
        }
      } else {
        await handleIssueWriteEffects(parentIssue.id, tx);
      }
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

async function createIssueRecord(
  item: IssueInput,
  tx: PrismaExecutor,
  parentIssueCache: ParentIssueCache = new Map(),
  preflightCache?: ParentIssuePreflightCache
) {
  const publisher = await findPublisher(item.series?.publisher, tx);
  if (!publisher) throw new Error("Publisher not found");

  const { series, created: createdSeries } = await findOrCreateIssueSeries(item.series, publisher.id, tx);

  // 1. Find or create the parent Issue (the work)
  let parentIssue = await tx.issue.findFirst({
    where: {
      fkSeries: series.id,
      number: normalizeText(item.number),
    },
  });

  const now = new Date();
  if (!parentIssue) {
    parentIssue = await tx.issue.create({
      data: {
        title: normalizeText(item.title),
        number: normalizeText(item.number),
        legacyNumber: normalizeText(item.legacy_number),
        fkSeries: series.id,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  // 2. Verify we don't duplicate a Variant format/label for this parent Issue
  const duplicateVariant = await tx.variant.findFirst({
    where: {
      fkIssue: parentIssue.id,
      format: normalizeText(item.format),
      variantLabel: normalizeOptionalText(item.variant) || null,
    },
  });
  if (duplicateVariant) {
    throw new Error("Issue already exists");
  }

  // 3. Create the Variant
  const createdVariant = await tx.variant.create({
    data: {
      fkIssue: parentIssue.id,
      format: normalizeText(item.format),
      variantLabel: normalizeOptionalText(item.variant),
      releaseDate: coerceReleaseDateForDb(item.releasedate),
      pages: normalizeBigInt(item.pages) ?? BigInt(0),
      price: normalizeFloat(item.price),
      currency: normalizeOptionalText(item.currency) ?? "",
      comicGuideId: normalizeBigInt(item.comicguideid),
      isbn: normalizeOptionalText(item.isbn) ?? "",
      limitation: normalizeBigInt(item.limitation),
      addInfo: normalizeOptionalText(item.addinfo) ?? "",
      verified: Boolean(item.verified),
      collected: typeof item.collected === "boolean" ? item.collected : null,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Load the full series & publisher for the returned payload
  const fullParentIssue = await tx.issue.findUnique({
    where: { id: parentIssue.id },
    include: {
      series: {
        include: {
          publisher: true,
        },
      },
    },
  });
  if (!fullParentIssue) throw new Error("Issue not found after creation");

  await syncStoriesFromParentRefs(Number(fullParentIssue.id), item, tx, parentIssueCache, preflightCache);

  return {
    item: toIssuePayload(fullParentIssue, createdVariant),
    ...(createdSeries ? { meta: { createdSeries: toIssueSeriesMeta(series) } } : {}),
  };
}

async function createLinkedStoryRow(
  issueId: number,
  storyNumber: number,
  story: StoryInput,
  parentStoryId: number | null,
  linkedParentStoryIds: Set<number>,
  executor: PrismaExecutor
) {
  if (parentStoryId != null && parentStoryId > 0) {
    linkedParentStoryIds.add(parentStoryId);
  }

  const createdStory = await executor.story.create({
    data: {
      fkIssue: BigInt(issueId),
      fkParent: parentStoryId ? BigInt(parentStoryId) : null,
      number: BigInt(storyNumber),
      title: normalizeText(story.title),
      addInfo: normalizeText(story.addinfo),
      part: normalizeText(story.part),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await linkStoryIndividuals(Number(createdStory.id), story.individuals || [], executor);
  await linkStoryAppearances(Number(createdStory.id), story.appearances || [], executor);
}

function readStoryParentLookup(story: StoryInput): ParentIssueLookup | null {
  const title = normalizeText(story.parent?.issue?.series?.title);
  const volume = Number(story.parent?.issue?.series?.volume || 0);
  const number = normalizeText(story.parent?.issue?.number);
  if (!title || volume <= 0 || !number) return null;

  return {
    title,
    volume,
    number,
  };
}

function getParentIssueCacheKey(input: { title: string; volume: number; number: string }) {
  return `${input.title}::${input.volume}::${input.number}`;
}

async function prepareParentIssuePreflight(item: IssueInput) {
  const preflightCache: ParentIssuePreflightCache = new Map();
  const stories = Array.isArray(item.stories) ? item.stories : [];

  for (const story of stories) {
    const parentLookup = readStoryParentLookup(story);
    if (!parentLookup) continue;
    await resolveParentIssuePreflight(parentLookup, preflightCache);
  }

  return preflightCache;
}

async function resolveParentIssuePreflight(
  parent: ParentIssueLookup,
  cache: ParentIssuePreflightCache,
  executor: PrismaExecutor = prisma
): Promise<ParentIssueResolution> {
  const cacheKey = getParentIssueCacheKey(parent);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const pending = (async (): Promise<ParentIssueResolution> => {
    const localIssueRefs = await findLocalParentIssueRefs(parent, executor);
    if (localIssueRefs.length > 0) {
      return {
        kind: "refs",
        refs: localIssueRefs,
      };
    }

    const crawledSeries = await crawler.crawlSeries(parent.title, parent.volume);
    const crawledIssue = (await crawler.crawlIssue(
      parent.title,
      parent.volume,
      parent.number
    )) as CrawledIssueLike;

    const normalizedCollectedIssues = normalizeCollectedIssues(crawledIssue);
    if (normalizedCollectedIssues.length > 0) {
      const containedItems: Array<{
        lookup: ParentIssueLookup;
        storyTitle?: string;
      }> = [];
      for (const containedIssue of normalizedCollectedIssues) {
        const lookup = {
          title: containedIssue.seriesTitle,
          volume: containedIssue.seriesVolume,
          number: containedIssue.number,
        };
        await resolveParentIssuePreflight(lookup, cache, executor);
        containedItems.push({
          lookup,
          storyTitle: containedIssue.storyTitle,
        });
      }

      if (containedItems.length > 0) {
        return {
          kind: "contained",
          items: containedItems,
        };
      }
    }

    return {
      kind: "issue",
      crawledSeries: {
        publisherName: crawledSeries.publisherName,
        title: crawledSeries.title,
        volume: crawledSeries.volume,
        startyear: crawledSeries.startyear,
        endyear: crawledSeries.endyear,
      },
      crawledIssue,
    };
  })();

  cache.set(cacheKey, pending);
  try {
    return await pending;
  } catch (error) {
    cache.delete(cacheKey);
    throw error;
  }
}

async function resolveParentStoriesForInputStory(
  story: StoryInput,
  parentIssueCache: ParentIssueCache,
  executor: PrismaExecutor,
  preflightCache?: ParentIssuePreflightCache
) {
  const parentLookup = readStoryParentLookup(story);
  if (!parentLookup) return [];

  const cacheKey = getParentIssueCacheKey(parentLookup);
  let parentIssueRefs = parentIssueCache.get(cacheKey);
  if (parentIssueRefs == null) {
    parentIssueRefs = await findOrCrawlParentIssueRefs(parentLookup, executor, preflightCache);
    parentIssueCache.set(cacheKey, parentIssueRefs);
  }
  if (parentIssueRefs.length === 0) return [];

  const requestedParentStoryNumber = Number(story.parent?.number || 0);
  const requestedStoryTitle = normalizeStoryTitleKey(story.title);
  const matchedParentRefsByTitle =
    requestedStoryTitle === ""
      ? []
      : parentIssueRefs.filter(
          (entry) => normalizeStoryTitleKey(entry.storyTitle) === requestedStoryTitle
        );

  const parentStories = await executor.story.findMany({
    where: {
      fkIssue: { in: parentIssueRefs.map((entry) => entry.issueId) },
      ...(requestedParentStoryNumber > 0
        ? { number: BigInt(requestedParentStoryNumber) }
        : {}),
    },
    orderBy: [{ fkIssue: "asc" }, { number: "asc" }, { id: "asc" }],
    select: { id: true, fkIssue: true, title: true, number: true },
  });

  if (requestedParentStoryNumber > 0) {
    return parentStories.filter(
      (entry) =>
        Number(entry.number || 0) === requestedParentStoryNumber &&
        matchesResolvedParentStory(entry, matchedParentRefsByTitle)
    );
  }

  if (matchedParentRefsByTitle.length > 0) {
    return parentStories.filter((entry) => matchesResolvedParentStory(entry, matchedParentRefsByTitle));
  }

  return parentStories;
}

function matchesResolvedParentStory(
  parentStory: { fkIssue: bigint | null; title: string },
  matchedParentRefsByTitle: ParentIssueRef[]
) {
  if (matchedParentRefsByTitle.length === 0) return true;

  return matchedParentRefsByTitle.some(
    (entry) =>
      entry.issueId === parentStory.fkIssue &&
      normalizeStoryTitleKey(entry.storyTitle) === normalizeStoryTitleKey(parentStory.title)
  );
}

async function syncStoriesFromParentRefs(
  issueId: number,
  item: IssueInput,
  executor: PrismaExecutor,
  parentIssueCache: ParentIssueCache = new Map(),
  preflightCache?: ParentIssuePreflightCache
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

  let nextStoryNumber = 1;

  for (const story of inputStories) {
    const requestedStoryNumber = Number(story.number || 0);
    const resolvedStoryNumber = requestedStoryNumber > 0 ? requestedStoryNumber : nextStoryNumber++;
    if (resolvedStoryNumber >= nextStoryNumber) nextStoryNumber = resolvedStoryNumber + 1;

    const selectedParentStories = await resolveParentStoriesForInputStory(
      story,
      parentIssueCache,
      executor,
      preflightCache
    );

    if (selectedParentStories.length === 0) {
      await createLinkedStoryRow(issueId, resolvedStoryNumber, story, null, newlyLinkedParentStoryIds, executor);
      continue;
    }

    for (const parentStory of selectedParentStories) {
      await createLinkedStoryRow(
        issueId,
        resolvedStoryNumber,
        story,
        Number(parentStory.id),
        newlyLinkedParentStoryIds,
        executor
      );
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

async function findOrCrawlParentIssueRefs(
  parent: ParentIssueLookup,
  executor: PrismaExecutor,
  preflightCache?: ParentIssuePreflightCache
): Promise<ParentIssueRef[]> {
  const localIssueRefs = await findLocalParentIssueRefs(parent, executor);
  if (localIssueRefs.length > 0) return localIssueRefs;

  const resolution = preflightCache
    ? await resolveParentIssuePreflight(parent, preflightCache)
    : await resolveParentIssuePreflight(parent, new Map());

  if (resolution.kind === "refs") {
    return resolution.refs;
  }

  if (resolution.kind === "contained") {
    const containedIssueRefs = new Map<string, ParentIssueRef>();
    for (const containedItem of resolution.items) {
      const refs = await findOrCrawlParentIssueRefs(containedItem.lookup, executor, preflightCache);
      refs.forEach((ref) => {
        const key = `${String(ref.issueId)}::${normalizeStoryTitleKey(containedItem.storyTitle || ref.storyTitle)}`;
        containedIssueRefs.set(key, {
          issueId: ref.issueId,
          storyTitle: containedItem.storyTitle || ref.storyTitle,
        });
      });
    }
    return Array.from(containedIssueRefs.values());
  }

  const publisher = await findOrCreateUsPublisher(resolution.crawledSeries.publisherName, executor);
  const series = await findOrCreateUsSeries(parent, resolution.crawledSeries, publisher.id, executor);

  const issue = await executor.issue.findFirst({
    where: {
      number: parent.number,
      fkSeries: series.id,
    },
    select: { id: true },
  });
  if (issue) return [{ issueId: issue.id }];

  const { crawledIssue } = resolution;

  const normalizedCollectedIssues = normalizeCollectedIssues(crawledIssue);

  if (normalizedCollectedIssues.length > 0) {
    const containedIssueRefs = new Map<string, ParentIssueRef>();
    for (const containedIssue of normalizedCollectedIssues) {
      const refs = await findOrCrawlParentIssueRefs(
        {
          title: containedIssue.seriesTitle,
          volume: containedIssue.seriesVolume,
          number: containedIssue.number,
        },
        executor,
        preflightCache
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
      legacyNumber: normalizeText(crawledIssue.legacyNumber),
      fkSeries: series.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const createdVariant = await executor.variant.create({
    data: {
      fkIssue: createdIssue.id,
      format: "Heft",
      variantLabel: "",
      releaseDate: coerceReleaseDateForDb(crawledIssue.releasedate),
      pages: BigInt(0),
      price: normalizeFloat(crawledIssue.price),
      currency: normalizeOptionalText(crawledIssue.currency) ?? "USD",
      comicGuideId: BigInt(0),
      isbn: "",
      limitation: null,
      addInfo: "",
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
      fkVariant: createdVariant.id,
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
    const variantName = normalizeOptionalText(crawledVariant.variant);
    if (!variantName) continue;

    const variantFormat = normalizeText(crawledVariant.format || "Heft");

    // 1. Find or create the parent Issue for this number
    let variantParentIssue = await executor.issue.findFirst({
      where: {
        fkSeries: series.id,
        number: variantNumber,
      },
    });

    if (!variantParentIssue) {
      variantParentIssue = await executor.issue.create({
        data: {
          title: "",
          number: variantNumber,
          legacyNumber: normalizeText(crawledVariant.legacyNumber || crawledIssue.legacyNumber),
          fkSeries: series.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // 2. Find or create the Variant under that parent Issue
    const existingVariant = await executor.variant.findFirst({
      where: {
        fkIssue: variantParentIssue.id,
        format: variantFormat,
        variantLabel: variantName,
      },
    });

    const dbVariant = existingVariant
      ? await executor.variant.update({
          where: {
            id: existingVariant.id,
          },
          data: {
            releaseDate: coerceReleaseDateForDb(
              crawledVariant.releasedate || crawledIssue.releasedate || ""
            ),
            price: normalizeFloat(crawledVariant.price),
            currency: normalizeOptionalText(crawledVariant.currency || crawledIssue.currency) ?? "USD",
            updatedAt: new Date(),
          },
        })
      : await executor.variant.create({
          data: {
            fkIssue: variantParentIssue.id,
            format: variantFormat,
            variantLabel: variantName,
            releaseDate: coerceReleaseDateForDb(
              crawledVariant.releasedate || crawledIssue.releasedate || ""
            ),
            pages: BigInt(0),
            price: normalizeFloat(crawledVariant.price),
            currency: normalizeOptionalText(crawledVariant.currency || crawledIssue.currency) ?? "USD",
            comicGuideId: BigInt(0),
            isbn: "",
            limitation: null,
            addInfo: "",
            verified: false,
            collected: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

    const variantCover = crawledVariant.cover;
    if (!variantCover) continue;

    const existingCover = await executor.cover.findFirst({
      where: {
        fkVariant: dbVariant.id,
      },
    });

    const createdVariantCover = existingCover
      ? await executor.cover.update({
          where: { id: existingCover.id },
          data: {
            url: normalizeOptionalText(variantCover.url) ?? "",
            number: BigInt(Number(variantCover.number || 0)),
            updatedAt: new Date(),
          },
        })
      : await executor.cover.create({
          data: {
            fkVariant: dbVariant.id,
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

async function findLocalParentIssueRefs(
  parent: { title: string; volume: number; number: string },
  executor: PrismaExecutor
) {
  const localIssues = await executor.issue.findMany({
    where: {
      number: parent.number,
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

  return localIssues.map((entry) => ({ issueId: entry.id }));
}

async function findOrCreateUsPublisher(
  publisherName: string | undefined,
  executor: PrismaExecutor
) {
  const normalizedPublisherName = normalizeText(publisherName) || "Marvel Comics";
  const existingPublisher = await executor.publisher.findFirst({
    where: {
      name: normalizedPublisherName,
      original: true,
    },
  });
  if (existingPublisher) return existingPublisher;

  return executor.publisher.create({
    data: {
      name: normalizedPublisherName,
      original: true,
      addInfo: "",
      startYear: BigInt(0),
      endYear: BigInt(0),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

async function findOrCreateUsSeries(
  parent: { title: string; volume: number },
  crawledSeries: {
    title: string;
    volume: number;
    startyear?: number;
    endyear?: number;
  },
  publisherId: bigint,
  executor: PrismaExecutor
) {
  const existingSeries = await executor.series.findFirst({
    where: {
      title: parent.title,
      volume: BigInt(parent.volume),
      fkPublisher: publisherId,
    },
  });
  if (existingSeries) return existingSeries;

  return executor.series.create({
    data: {
      title: crawledSeries.title,
      volume: BigInt(crawledSeries.volume),
      startYear: BigInt(crawledSeries.startyear || 0),
      endYear: BigInt(crawledSeries.endyear || 0),
      addInfo: "",
      fkPublisher: publisherId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

function normalizeCollectedIssues(crawledIssue: CrawledIssueLike) {
  let collectedEntries: NonNullable<CrawledIssueLike["collectedIssues"]> = [];
  if (Array.isArray(crawledIssue.collectedIssues)) {
    collectedEntries = crawledIssue.collectedIssues;
  } else if (Array.isArray(crawledIssue.containedIssues)) {
    collectedEntries = crawledIssue.containedIssues;
  }

  return collectedEntries
    .map((entry) => ({
      number: normalizeText(entry?.number),
      storyTitle: normalizeText(entry?.storyTitle),
      seriesTitle: normalizeText(entry?.series?.title),
      seriesVolume: Number(entry?.series?.volume || 0),
    }))
    .filter((entry) => entry.number && entry.seriesTitle && entry.seriesVolume > 0);
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

function toIssuePayload(
  issue: {
    id: bigint;
    title: string;
    number: string;
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
  },
  variant?: {
    id: bigint;
    format: string;
    variantLabel: string | null;
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
  } | null
) {
  return {
    id: String(issue.id),
    variantId: variant ? String(variant.id) : undefined,
    title: issue.title || "",
    number: issue.number || "",
    format: variant?.format || "",
    variant: variant?.variantLabel || "",
    releasedate: variant?.releaseDate ? variant.releaseDate.toISOString().slice(0, 10) : "",
    pages: variant?.pages === null || variant?.pages === undefined ? 0 : Number(variant.pages),
    price: variant?.price ? Number(variant.price) : 0,
    currency: variant?.currency || "",
    comicguideid: variant?.comicGuideId === null || variant?.comicGuideId === undefined ? 0 : Number(variant.comicGuideId),
    isbn: variant?.isbn || "",
    limitation: variant?.limitation === null || variant?.limitation === undefined ? "" : String(variant.limitation),
    addinfo: variant?.addInfo || "",
    verified: variant?.verified ?? false,
    collected: variant?.collected ?? false,
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

  const matchedVariant = await executor.variant.findFirst({
    where: {
      issue: {
        fkSeries: input.fkSeries,
        number: normalizedNumber,
        ...(input.excludeId ? { NOT: { id: input.excludeId } } : {}),
      },
      format: normalizedFormat,
      variantLabel: normalizedVariant || null,
    },
    select: {
      fkIssue: true,
    },
  });

  return matchedVariant ? { id: matchedVariant.fkIssue } : null;
}


