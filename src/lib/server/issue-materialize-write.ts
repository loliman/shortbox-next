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

async function resolveRecursiveRelatedParentIds(
  initialParentIds: bigint[],
  tx: PrismaExecutor
): Promise<bigint[]> {
  const discovered = new Set<bigint>(initialParentIds);
  let frontier = [...initialParentIds];

  while (frontier.length > 0) {
    const [rowsById, rowsByReprint] = await Promise.all([
      tx.story.findMany({
        where: { id: { in: frontier } },
        select: { id: true, fkReprint: true },
      }),
      tx.story.findMany({
        where: { fkReprint: { in: frontier } },
        select: { id: true, fkReprint: true },
      }),
    ]);

    const nextFrontier = new Set<bigint>();

    const addDiscoveredId = (value: bigint | null) => {
      if (value == null || discovered.has(value)) return;
      discovered.add(value);
      nextFrontier.add(value);
    };

    for (const story of rowsById) {
      addDiscoveredId(story.fkReprint);
    }

    for (const story of rowsByReprint) {
      addDiscoveredId(story.id);
      addDiscoveredId(story.fkReprint);
    }

    frontier = Array.from(nextFrontier);
  }

  return Array.from(discovered);
}

export async function recalculateStoryCollectionFlagsForFamilies(
  familyIds: bigint[],
  tx: PrismaExecutor
): Promise<void> {
  if (familyIds.length === 0) return;

  const allFamilyIds = await resolveRecursiveRelatedParentIds(familyIds, tx);
  if (allFamilyIds.length === 0) return;

  const storiesInFamilies = await tx.story.findMany({
    where: { id: { in: allFamilyIds } },
    select: { id: true, fkReprint: true },
  });

  const adjacency = new Map<bigint, Set<bigint>>();
  const parentIds = new Set<bigint>(allFamilyIds);

  for (const story of storiesInFamilies) {
    const id = story.id;
    if (!adjacency.has(id)) adjacency.set(id, new Set());

    if (story.fkReprint != null) {
      const reprintId = story.fkReprint;
      if (!adjacency.has(reprintId)) adjacency.set(reprintId, new Set());
      adjacency.get(id)!.add(reprintId);
      adjacency.get(reprintId)!.add(id);
      parentIds.add(reprintId);
    }
  }

  const visited = new Set<bigint>();
  const components: bigint[][] = [];

  for (const id of parentIds) {
    if (visited.has(id)) continue;

    const component: bigint[] = [];
    const queue = [id];
    visited.add(id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      const neighbors = adjacency.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
    }
    components.push(component);
  }

  for (const componentIds of components) {
    if (componentIds.length === 0) continue;

    const rawCount = await tx.$queryRaw<Array<{ collected_count: bigint }>>`
      SELECT COUNT(v.id) AS collected_count
      FROM shortbox.story s
      JOIN shortbox.variant v ON v.fk_issue = s.fk_issue
      WHERE v.collected = true
        AND COALESCE(s.fk_parent, s.id) IN (${Prisma.join(componentIds)})
    `;

    const count = Number(rawCount[0]?.collected_count ?? 0n);

    await tx.$executeRaw`
      UPDATE shortbox.story s
      SET 
        collected = ${count > 0},
        collectedmultipletimes = ${count >= 2}
      FROM (
        SELECT s_inner.id
        FROM shortbox.story s_inner
        WHERE COALESCE(s_inner.fk_parent, s_inner.id) IN (${Prisma.join(componentIds)})
      ) s_data
      WHERE s.id = s_data.id;
    `;
  }
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
