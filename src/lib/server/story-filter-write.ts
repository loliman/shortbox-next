import { prisma } from "../prisma/client";

type StoryWithIssue = {
  id: bigint;
  fkParent: bigint | null;
  part: string;
  partNumber: number | null;
  partTotal: number | null;
  firstApp: boolean;
  firstCompleteApp: boolean;
  firstPartialApp: boolean;
  onlyApp: boolean;
  otherOnlyTb: boolean;
  onlyTb: boolean;
  onlyOnePrint: boolean;
  issue: {
    fkSeries: bigint | null;
    variants: Array<{
      format: string;
      releaseDate: Date | null;
    }>;
  } | null;
};

type StoryWithRelations = {
  id: bigint;
  fkReprint: bigint | null;
  part: string;
  onlyTb: boolean;
  onlyOnePrint: boolean;
};

const toPositiveInt = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const intValue = Math.trunc(numeric);
  return intValue > 0 ? intValue : null;
};

const normalizeParentIds = (parentStoryIds: Iterable<number>): number[] =>
  Array.from(new Set(Array.from(parentStoryIds)))
    .map((entry) => toPositiveInt(entry))
    .filter((entry): entry is number => entry != null);

const isPocketBookFormat = (format: unknown): boolean =>
  normalizeText(format).toLowerCase() === "taschenbuch";

export function parsePart(partStr: string | null | undefined): { partNumber: number | null; partTotal: number | null } {
  if (!partStr) return { partNumber: null, partTotal: null };
  const trimmed = partStr.trim();
  if (!trimmed) return { partNumber: null, partTotal: null };

  const numNumMatch = /^(\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (numNumMatch) {
    return {
      partNumber: parseInt(numNumMatch[1], 10),
      partTotal: parseInt(numNumMatch[2], 10),
    };
  }

  const numXMatch = /^(\d+)\s*\/\s*x$/i.exec(trimmed);
  if (numXMatch) {
    return {
      partNumber: parseInt(numXMatch[1], 10),
      partTotal: null,
    };
  }

  return { partNumber: null, partTotal: null };
}

const normalizeText = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  return "";
};

function addDiscoveredId(discovered: Set<number>, nextFrontier: Set<number>, value: unknown) {
  const id = toPositiveInt(value);
  if (id == null || discovered.has(id)) return;
  discovered.add(id);
  nextFrontier.add(id);
}

async function resolveRecursiveRelatedParentIds(initialParentIds: number[]): Promise<number[]> {
  const discovered = new Set<number>(initialParentIds);
  let frontier = [...initialParentIds];

  while (frontier.length > 0) {
    const [rowsById, rowsByReprint] = await Promise.all([
      prisma.story.findMany({
        where: { id: { in: frontier.map(BigInt) } },
        select: { id: true, fkReprint: true },
      }),
      prisma.story.findMany({
        where: { fkReprint: { in: frontier.map(BigInt) } },
        select: { id: true, fkReprint: true },
      }),
    ]);

    const nextFrontier = new Set<number>();

    for (const story of rowsById) {
      addDiscoveredId(discovered, nextFrontier, story.fkReprint);
    }

    for (const story of rowsByReprint) {
      addDiscoveredId(discovered, nextFrontier, story.id);
      addDiscoveredId(discovered, nextFrontier, story.fkReprint);
    }

    frontier = Array.from(nextFrontier);
  }

  return Array.from(discovered);
}

function linkParentNodes(adjacency: Map<number, Set<number>>, parentIds: Set<number>, left: number, right: number) {
  if (!adjacency.has(left)) adjacency.set(left, new Set<number>());
  if (!adjacency.has(right)) adjacency.set(right, new Set<number>());
  parentIds.add(left);
  parentIds.add(right);
  adjacency.get(left)?.add(right);
  adjacency.get(right)?.add(left);
}

function collectConnectedComponent(
  startId: number,
  adjacency: Map<number, Set<number>>,
  visited: Set<number>
) {
  const component: number[] = [];
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current == null) continue;
    component.push(current);

    const neighbors = adjacency.get(current);
    if (!neighbors) continue;

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      queue.push(neighbor);
    }
  }

  return component;
}

function groupConnectedParents(parents: StoryWithRelations[]): number[][] {
  const parentIds = new Set<number>();
  const adjacency = new Map<number, Set<number>>();

  for (const parent of parents) {
    const parentId = toPositiveInt(parent.id);
    if (parentId == null) continue;
    parentIds.add(parentId);
    if (!adjacency.has(parentId)) adjacency.set(parentId, new Set<number>());

    const fkReprint = toPositiveInt(parent.fkReprint);
    if (fkReprint == null) continue;
    linkParentNodes(adjacency, parentIds, parentId, fkReprint);
  }

  const visited = new Set<number>();
  const components: number[][] = [];

  for (const id of parentIds) {
    if (visited.has(id)) continue;
    components.push(collectConnectedComponent(id, adjacency, visited));
  }

  return components;
}

function buildParentStoryMap(parentStories: StoryWithRelations[]) {
  const parentStoryById = new Map<number, StoryWithRelations>();
  for (const parent of parentStories) {
    const parentId = toPositiveInt(parent.id);
    if (parentId != null) parentStoryById.set(parentId, parent);
  }
  return parentStoryById;
}

function buildChildrenByParent(childrenRaw: StoryWithIssue[]) {
  const childrenByParent = new Map<number, StoryWithIssue[]>();
  for (const child of childrenRaw) {
    const parentId = toPositiveInt(child.fkParent);
    if (parentId == null) continue;

    const grouped = childrenByParent.get(parentId) || [];
    grouped.push(child);
    childrenByParent.set(parentId, grouped);
  }
  return childrenByParent;
}

function analyzeChildGroup(childrenInGroup: StoryWithIssue[]) {
  let tbCount = 0;
  let notTbCount = 0;

  for (const child of childrenInGroup) {
    const childIssue = child.issue;
    const isPocketBook = childIssue?.variants.some((v) => isPocketBookFormat(v.format)) ?? false;
    if (isPocketBook) tbCount += 1;
    else notTbCount += 1;
  }

  return {
    singleRelease: childrenInGroup.length === 1,
    parentOnlyTb: tbCount > 0 && notTbCount === 0,
    hasOnlyOneNonTb: tbCount > 0 && notTbCount === 1,
  };
}

async function applyParentGroupUpdates(
  parentsInGroup: StoryWithRelations[],
  childrenInGroup: StoryWithIssue[]
) {
  const analysis = analyzeChildGroup(childrenInGroup);

  for (const parent of parentsInGroup) {
    if (parent.onlyTb !== analysis.parentOnlyTb || parent.onlyOnePrint !== analysis.singleRelease) {
      await prisma.story.update({
        where: { id: parent.id },
        data: {
          onlyTb: analysis.parentOnlyTb,
          onlyOnePrint: analysis.singleRelease,
        },
      });
    }
  }

  const groupsMap = new Map<number, StoryWithIssue[]>();
  for (const child of childrenInGroup) {
    const seriesId = child.issue ? Number(child.issue.fkSeries) : 0;
    if (seriesId === 0) continue;
    const list = groupsMap.get(seriesId) || [];
    list.push(child);
    groupsMap.set(seriesId, list);
  }

  type SeriesGroup = {
    seriesId: number;
    children: StoryWithIssue[];
    earliestReleaseDate: number;
    isComplete: boolean;
    completionDate: number;
  };

  const sortedGroups: SeriesGroup[] = Array.from(groupsMap.entries()).map(([seriesId, children]) => {
    let earliestReleaseDate = Number.POSITIVE_INFINITY;
    for (const child of children) {
      const dates = child.issue?.variants
        .map(v => v.releaseDate ? v.releaseDate.getTime() : null)
        .filter((t): t is number => t !== null) ?? [];
      const childDate = dates.length > 0 ? Math.min(...dates) : Number.POSITIVE_INFINITY;
      if (childDate < earliestReleaseDate) {
        earliestReleaseDate = childDate;
      }
    }

    const parsedChildren = children.map(c => ({
      child: c,
      parsed: parsePart(c.part),
    }));

    const hasCompleteChild = parsedChildren.some(p => p.parsed.partNumber === null);
    let isComplete = false;
    let completionDate = Number.POSITIVE_INFINITY;

    if (hasCompleteChild) {
      isComplete = true;
      const completeReleaseDates = parsedChildren
        .filter(p => p.parsed.partNumber === null)
        .map(p => {
          const dates = p.child.issue?.variants
            .map(v => v.releaseDate ? v.releaseDate.getTime() : null)
            .filter((t): t is number => t !== null) ?? [];
          return dates.length > 0 ? Math.min(...dates) : Number.POSITIVE_INFINITY;
        });
      completionDate = completeReleaseDates.length > 0 ? Math.min(...completeReleaseDates) : Number.POSITIVE_INFINITY;
    } else {
      let partTotalValue: number | null = null;
      const partNumbersPresent = new Set<number>();
      for (const p of parsedChildren) {
        if (p.parsed.partNumber !== null && p.parsed.partTotal !== null && p.parsed.partTotal > 1) {
          partTotalValue = p.parsed.partTotal;
          partNumbersPresent.add(p.parsed.partNumber);
        }
      }

      if (partTotalValue !== null) {
        let isPartsComplete = true;
        for (let k = 1; k <= partTotalValue; k++) {
          if (!partNumbersPresent.has(k)) {
            isPartsComplete = false;
            break;
          }
        }
        if (isPartsComplete) {
          isComplete = true;
          const partReleaseDates = parsedChildren
            .filter(p => p.parsed.partTotal === partTotalValue)
            .map(p => {
              const dates = p.child.issue?.variants
                .map(v => v.releaseDate ? v.releaseDate.getTime() : null)
                .filter((t): t is number => t !== null) ?? [];
              return dates.length > 0 ? Math.min(...dates) : Number.POSITIVE_INFINITY;
            });
          completionDate = partReleaseDates.length > 0 ? Math.max(...partReleaseDates) : Number.POSITIVE_INFINITY;
        }
      }
    }

    return {
      seriesId,
      children,
      earliestReleaseDate,
      isComplete,
      completionDate,
    };
  }).sort((a, b) => {
    if (a.earliestReleaseDate !== b.earliestReleaseDate) {
      return a.earliestReleaseDate - b.earliestReleaseDate;
    }
    return a.seriesId - b.seriesId;
  });

  let hasPriorCompleteGroup = false;
  let hasPriorCompleteSingleIssue = false;
  const priorPublishedPartNumbers = new Set<number>();

  type ChildUpdate = {
    child: StoryWithIssue;
    nextFirstApp: boolean;
    nextFirstPartialApp: boolean;
    nextFirstCompleteApp: boolean;
    partNumber: number | null;
    partTotal: number | null;
  };

  const childUpdates: ChildUpdate[] = [];

  for (const g of sortedGroups) {
    if (hasPriorCompleteGroup) {
      for (const child of g.children) {
        const parsed = parsePart(child.part);
        let nextFirstCompleteApp = false;
        if (parsed.partNumber === null && !hasPriorCompleteSingleIssue) {
          nextFirstCompleteApp = true;
          hasPriorCompleteSingleIssue = true;
        }
        childUpdates.push({
          child,
          nextFirstApp: false,
          nextFirstPartialApp: false,
          nextFirstCompleteApp,
          partNumber: parsed.partNumber,
          partTotal: parsed.partTotal,
        });
      }
    } else {
      if (g.isComplete) {
        for (const child of g.children) {
          const parsed = parsePart(child.part);
          let nextFirstApp = false;
          let nextFirstPartialApp = false;
          if (parsed.partNumber === null) {
            nextFirstApp = true;
            hasPriorCompleteSingleIssue = true;
          } else if (parsed.partTotal !== null && parsed.partNumber <= parsed.partTotal) {
            nextFirstApp = true;
            nextFirstPartialApp = true;
          }
          childUpdates.push({
            child,
            nextFirstApp,
            nextFirstPartialApp,
            nextFirstCompleteApp: false,
            partNumber: parsed.partNumber,
            partTotal: parsed.partTotal,
          });
        }
        hasPriorCompleteGroup = true;
      } else {
        for (const child of g.children) {
          const parsed = parsePart(child.part);
          let nextFirstApp = false;
          let nextFirstPartialApp = false;
          if (parsed.partNumber !== null) {
            if (!priorPublishedPartNumbers.has(parsed.partNumber)) {
              nextFirstApp = true;
              nextFirstPartialApp = true;
            }
          }
          childUpdates.push({
            child,
            nextFirstApp,
            nextFirstPartialApp,
            nextFirstCompleteApp: false,
            partNumber: parsed.partNumber,
            partTotal: parsed.partTotal,
          });
        }
        for (const child of g.children) {
          const parsed = parsePart(child.part);
          if (parsed.partNumber !== null) {
            priorPublishedPartNumbers.add(parsed.partNumber);
          }
        }
      }
    }
  }

  for (const update of childUpdates) {
    const { child, nextFirstApp, nextFirstPartialApp, nextFirstCompleteApp, partNumber, partTotal } = update;
    const isPocketBook = child.issue?.variants.some((v) => isPocketBookFormat(v.format)) ?? false;
    const nextOtherOnlyTb = analysis.hasOnlyOneNonTb && !isPocketBook;

    if (
      child.onlyApp !== analysis.singleRelease ||
      child.firstApp !== nextFirstApp ||
      child.firstCompleteApp !== nextFirstCompleteApp ||
      child.firstPartialApp !== nextFirstPartialApp ||
      child.partNumber !== partNumber ||
      child.partTotal !== partTotal ||
      child.otherOnlyTb !== nextOtherOnlyTb ||
      child.onlyTb !== false
    ) {
      await prisma.story.update({
        where: { id: child.id },
        data: {
          onlyApp: analysis.singleRelease,
          firstApp: nextFirstApp,
          firstCompleteApp: nextFirstCompleteApp,
          firstPartialApp: nextFirstPartialApp,
          partNumber,
          partTotal,
          otherOnlyTb: nextOtherOnlyTb,
          onlyTb: false,
        },
      });
    }
  }
}

async function updateStoryFilterFlagsForParents(parentStoryIds: Iterable<number>): Promise<void> {
  const initialParentIds = normalizeParentIds(parentStoryIds);
  if (initialParentIds.length === 0) return;

  const recursiveParentIds = await resolveRecursiveRelatedParentIds(initialParentIds);
  if (recursiveParentIds.length === 0) return;

  const parentStoriesRaw = await prisma.story.findMany({
    where: { id: { in: recursiveParentIds.map(BigInt) } },
    select: {
      id: true,
      fkReprint: true,
      part: true,
      onlyTb: true,
      onlyOnePrint: true,
    },
  });
  const parentStories = parentStoriesRaw as StoryWithRelations[];
  if (parentStories.length === 0) return;

  const parentStoryById = buildParentStoryMap(parentStories);
  const parentGroups = groupConnectedParents(parentStories);
  const allParentIds = Array.from(parentStoryById.keys());

  const childrenRaw = await prisma.story.findMany({
    where: { fkParent: { in: allParentIds.map(BigInt) } },
    include: {
      issue: {
        select: {
          fkSeries: true,
          variants: {
            select: {
              format: true,
              releaseDate: true,
            },
          },
        },
      },
    },
  });
  const childrenByParent = buildChildrenByParent(childrenRaw as unknown as StoryWithIssue[]);

  for (const groupParentIds of parentGroups) {
    const parentsInGroup = groupParentIds
      .map((id) => parentStoryById.get(id))
      .filter((entry): entry is StoryWithRelations => Boolean(entry));

    if (parentsInGroup.length === 0) continue;

    const childrenInGroup: StoryWithIssue[] = groupParentIds.flatMap(
      (parentId) => childrenByParent.get(parentId) || []
    ) as StoryWithIssue[];
    await applyParentGroupUpdates(parentsInGroup, childrenInGroup);
  }
}

type IssueAggregateStoryShape = {
  firstApp: boolean;
  onlyApp: boolean;
  onlyTb: boolean;
  otherOnlyTb: boolean;
  onlyOnePrint: boolean;
  fkParent: bigint | null;
};

export type IssueFilterAggregates = {
  hasFirstPrint: boolean;
  hasOnlyPrint: boolean;
  hasOnlyTb: boolean;
  hasExclusiveStory: boolean;
  isReprintOnly: boolean;
  hasOtherOnlyTb: boolean;
  hasPrintStory: boolean;
  hasOnlyOnePrint: boolean;
};

export function deriveIssueAggregatesFromStories(
  stories: ReadonlyArray<IssueAggregateStoryShape>
): IssueFilterAggregates {
  return {
    hasFirstPrint: stories.some((story) => story.firstApp),
    hasOnlyPrint: stories.some((story) => story.onlyApp),
    hasOnlyTb: stories.some((story) => story.onlyTb),
    hasExclusiveStory: stories.some((story) => story.fkParent == null),
    isReprintOnly: stories.length > 0 && stories.every((story) => !story.firstApp),
    hasOtherOnlyTb: stories.some((story) => story.otherOnlyTb),
    hasPrintStory: stories.some((story) => story.firstApp || story.onlyApp),
    hasOnlyOnePrint: stories.some((story) => story.onlyOnePrint),
  };
}

export async function updateStoryFilterFlagsForIssue(issueId: number): Promise<void> {
  const numericIssueId = toPositiveInt(issueId);
  if (numericIssueId == null) return;

  const issue = await prisma.issue.findFirst({
    where: { id: BigInt(numericIssueId) },
    select: {
      id: true,
      number: true,
      fkSeries: true,
      series: {
        select: {
          publisher: {
            select: {
              id: true,
              original: true,
            },
          },
        },
      },
    },
  });

  if (issue == null) return;

  const isUsIssue = Boolean(issue.series?.publisher?.original);
  const publisherId = issue.series?.publisher?.id ?? null;

  const siblingIssues = await prisma.issue.findMany({
    where: {
      fkSeries: issue.fkSeries,
      number: issue.number,
    },
    select: { id: true },
  });
  const siblingIssueIds = siblingIssues.map((sibling) => sibling.id);

  const stories = await prisma.story.findMany({
    where: { fkIssue: { in: siblingIssueIds } },
    select: { id: true, fkParent: true },
  });

  const parentIds = isUsIssue
    ? stories
        .map((story) => (toPositiveInt(story.fkParent) == null ? toPositiveInt(story.id) : null))
        .filter((id): id is number => id != null)
    : stories
        .map((story) => toPositiveInt(story.fkParent))
        .filter((id): id is number => id != null);

  await updateStoryFilterFlagsForParents(parentIds);

  const storiesForAggregates = await prisma.story.findMany({
    where: { fkIssue: { in: siblingIssueIds } },
    select: {
      firstApp: true,
      onlyApp: true,
      onlyTb: true,
      otherOnlyTb: true,
      onlyOnePrint: true,
      fkParent: true,
    },
  });

  const aggregates = deriveIssueAggregatesFromStories(storiesForAggregates);

  await prisma.issue.updateMany({
    where: { id: { in: siblingIssueIds } },
    data: {
      ...aggregates,
      fkPublisher: publisherId,
    },
  });
}
