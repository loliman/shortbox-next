import "server-only";
import { Prisma, PrismaClient } from "@prisma/client";
import { compareIssueVariants } from "../read/issue-read-shared";

export type PrismaExecutor = Prisma.TransactionClient | PrismaClient;

const getNormalizedPublisherGroup = (name: string | null | undefined): string => {
  if (!name) return "";
  const upper = name.toUpperCase();
  if (upper.includes("PANINI")) {
    return "PANINI";
  }
  return upper;
};

export async function recalculatePreferredVariantForIssue(
  issueId: bigint,
  tx: PrismaExecutor
): Promise<void> {
  const variants = await tx.variant.findMany({
    where: { fkIssue: issueId },
    include: {
      covers: {
        orderBy: [{ number: "asc" }, { id: "asc" }],
        take: 1,
      },
    },
  });

  if (variants.length === 0) {
    await tx.issue.update({
      where: { id: issueId },
      data: {
        preferredVariantId: null,
        preferredCoverUrl: null,
        preferredFormat: null,
        preferredVariantLabel: null,
      },
    });
    return;
  }

  const sortedVariants = [...variants].sort(compareIssueVariants);
  const preferredVariant = sortedVariants[0];
  const preferredCoverUrl = preferredVariant.covers[0]?.url || null;

  await tx.issue.update({
    where: { id: issueId },
    data: {
      preferredVariantId: preferredVariant.id,
      preferredCoverUrl,
      preferredFormat: preferredVariant.format,
      preferredVariantLabel: preferredVariant.variantLabel,
    },
  });
}

export async function recalculateCollectionFlagsForIssues(
  issueIds: bigint[],
  tx: PrismaExecutor
): Promise<void> {
  if (issueIds.length === 0) return;

  const issues = await tx.issue.findMany({
    where: { id: { in: issueIds } },
    include: {
      series: { include: { publisher: true } },
      stories: true,
    },
  });

  for (const issue of issues) {
    if (!issue.series?.publisher || issue.series.publisher.original) {
      continue;
    }

    const publisherName = issue.series.publisher.name;
    const publisherGroup = getNormalizedPublisherGroup(publisherName);

    const siblingIssues = await tx.issue.findMany({
      where: {
        fkSeries: issue.fkSeries,
        number: issue.number,
      },
      select: {
        variants: {
          select: { collected: true },
        },
      },
    });

    const anySiblingCollected = siblingIssues.some(sib =>
      sib.variants.some(v => v.collected === true)
    );
    const noOwnedVariants = !anySiblingCollected;

    const parentIds = issue.stories
      .map(s => s.fkParent)
      .filter((id): id is bigint => id != null);

    let doubleCollected = false;
    let doublePublisherCollected = false;
    let notOwnedUsMaterial = false;

    if (parentIds.length > 0) {
      const collectedUsStories = await tx.story.findMany({
        where: {
          id: { in: parentIds },
          issue: {
            variants: { some: { collected: true } },
            series: { publisher: { original: true } },
          },
        },
        select: { id: true },
      });
      const collectedUsParentIds = new Set(collectedUsStories.map(s => s.id));

      const collectedDeStories = await tx.story.findMany({
        where: {
          fkParent: { in: parentIds },
          issue: {
            variants: { some: { collected: true } },
            series: { publisher: { original: false } },
          },
        },
        select: {
          fkParent: true,
          fkIssue: true,
          issue: {
            select: {
              series: {
                select: {
                  publisher: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      let allOwnedElsewhere = true;
      let allOwnedPublisherElsewhere = true;

      for (const story of issue.stories) {
        const parentId = story.fkParent;
        if (parentId == null) continue;
        const isOwnedInUs = collectedUsParentIds.has(parentId);

        const isOwnedInOtherDe = collectedDeStories.some(de =>
          de.fkParent === parentId && de.fkIssue !== issue.id
        );

        if (!isOwnedInUs && !isOwnedInOtherDe) {
          allOwnedElsewhere = false;
        }

        const isOwnedInSamePublisherDe = collectedDeStories.some(de =>
          de.fkParent === parentId &&
          de.fkIssue !== issue.id &&
          getNormalizedPublisherGroup(de.issue?.series?.publisher?.name) === publisherGroup
        );

        if (!isOwnedInSamePublisherDe) {
          allOwnedPublisherElsewhere = false;
        }
      }

      doubleCollected = allOwnedElsewhere;
      doublePublisherCollected = allOwnedPublisherElsewhere;
    }

    if (parentIds.length > 0) {
      const collectedUsStories = await tx.story.findMany({
        where: {
          id: { in: parentIds },
          issue: {
            variants: { some: { collected: true } },
            series: { publisher: { original: true } },
          },
        },
        select: { id: true },
      });
      const collectedUsParentIds = new Set(collectedUsStories.map(s => s.id));

      const collectedDeStories = await tx.story.findMany({
        where: {
          fkParent: { in: parentIds },
          issue: {
            variants: { some: { collected: true } },
          },
        },
        select: { fkParent: true },
      });
      const collectedDeParentIds = new Set(collectedDeStories.map(s => s.fkParent!));

      const hasUnownedUsMaterial = issue.stories.some(story => {
        if (story.fkParent === null) return false;
        const parentId = story.fkParent;
        const ownedUs = collectedUsParentIds.has(parentId);
        const ownedDe = collectedDeParentIds.has(parentId);
        return !ownedUs && !ownedDe;
      });

      notOwnedUsMaterial = hasUnownedUsMaterial;
    }

    await tx.issue.update({
      where: { id: issue.id },
      data: {
        doubleCollected,
        doublePublisherCollected,
        notOwnedUsMaterial,
        noOwnedVariants,
      },
    });
  }
}

export async function recalculateStoryCollectionFlagsForFamilies(
  familyIds: bigint[],
  tx: PrismaExecutor
): Promise<void> {
  if (familyIds.length === 0) return;

  await tx.$executeRaw(Prisma.sql`
    WITH story_collected_counts AS (
      SELECT 
        COALESCE(s.fk_parent, s.id) AS parent_id,
        COUNT(v.id) AS collected_count
      FROM shortbox.story s
      JOIN shortbox.variant v ON v.fk_issue = s.fk_issue
      WHERE v.collected = true
        AND COALESCE(s.fk_parent, s.id) IN (${Prisma.join(familyIds)})
      GROUP BY COALESCE(s.fk_parent, s.id)
    )
    UPDATE shortbox.story s
    SET 
      collected = COALESCE(s_data.collected_count, 0) > 0,
      collectedmultipletimes = COALESCE(s_data.collected_count, 0) >= 2
    FROM (
      SELECT 
        s_inner.id,
        scc_inner.collected_count
      FROM shortbox.story s_inner
      LEFT JOIN story_collected_counts scc_inner ON scc_inner.parent_id = COALESCE(s_inner.fk_parent, s_inner.id)
      WHERE COALESCE(s_inner.fk_parent, s_inner.id) IN (${Prisma.join(familyIds)})
    ) s_data
    WHERE s.id = s_data.id;
  `);
}

export async function handleIssueWriteEffects(
  issueId: bigint,
  tx: PrismaExecutor
): Promise<void> {
  await recalculatePreferredVariantForIssue(issueId, tx);

  const stories = await tx.story.findMany({
    where: { fkIssue: issueId },
    select: { id: true, fkParent: true },
  });

  const familyIds = Array.from(new Set(stories.map(s => s.fkParent ?? s.id)));
  await recalculateStoryCollectionFlagsForFamilies(familyIds, tx);

  const parentIds = stories
    .map(s => s.fkParent)
    .filter((id): id is bigint => id != null);
  const ownStoryIds = stories.map(s => s.id);

  const issue = await tx.issue.findUnique({
    where: { id: issueId },
    select: { fkSeries: true, number: true },
  });

  const fkSeries = issue?.fkSeries ?? null;
  const number = issue?.number ?? "";

  const affectedIssues = await tx.issue.findMany({
    where: {
      series: { publisher: { original: false } },
      OR: [
        { id: issueId },
        ...(fkSeries !== null ? [{ fkSeries, number }] : []),
        ...(parentIds.length > 0 || ownStoryIds.length > 0
          ? [
              {
                stories: {
                  some: {
                    fkParent: { in: [...parentIds, ...ownStoryIds] },
                  },
                },
              },
            ]
          : []),
      ],
    },
    select: { id: true },
  });

  const affectedIssueIds = Array.from(new Set(affectedIssues.map(i => i.id)));

  await recalculateCollectionFlagsForIssues(affectedIssueIds, tx);
}
