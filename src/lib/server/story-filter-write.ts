import { prisma } from "../prisma/client";

type StoryWithIssue = {
  id: bigint;
  fkParent: bigint | null;
  part: string;
  onlyApp: boolean;
  firstApp: boolean;
  otherOnlyTb: boolean;
  onlyTb: boolean;
  onlyOnePrint: boolean;
  issue: {
    format: string;
    releaseDate: Date | null;
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

const toDateTimestamp = (value: unknown): number => {
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (value instanceof Date) {
    const parsed = value.getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Number.POSITIVE_INFINITY;
};

const isPocketBookFormat = (format: unknown): boolean =>
  normalizeText(format).toLowerCase() === "taschenbuch";

const PART_PATTERN = /^(\d+)\s*\/\s*(\d+)$/;

const parseStoryPart = (value: unknown): { current: number; total: number } | null => {
  const match = PART_PATTERN.exec(normalizeText(value));
  if (!match) return null;

  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || current <= 0 || total <= 0) {
    return null;
  }

  return { current, total };
};

const isPartialPublicationStart = (part: unknown): boolean => {
  const parsed = parseStoryPart(part);
  return parsed?.current === 1 && parsed.total > 1;
};

const isCompletePublication = (part: unknown): boolean => {
  const parsed = parseStoryPart(part);
  return !parsed || parsed.total <= 1;
};

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
  let firstPartialChildId: bigint | null = null;
  let firstPartialTimestamp = Number.POSITIVE_INFINITY;
  let firstFullChildId: bigint | null = null;
  let firstFullTimestamp = Number.POSITIVE_INFINITY;
  let tbCount = 0;
  let notTbCount = 0;

  const updateEarliest = (
    currentId: bigint | null,
    currentTimestamp: number,
    child: StoryWithIssue,
    releaseTimestamp: number
  ) => {
    const childId = toPositiveInt(child.id) || Number.MAX_SAFE_INTEGER;
    const bestId = currentId == null ? Number.MAX_SAFE_INTEGER : Number(currentId);
    if (releaseTimestamp < currentTimestamp) return { id: child.id, timestamp: releaseTimestamp };
    if (releaseTimestamp === currentTimestamp && childId < bestId) {
      return { id: child.id, timestamp: currentTimestamp };
    }
    return { id: currentId, timestamp: currentTimestamp };
  };

  for (const child of childrenInGroup) {
    const childIssue = child.issue;
    if (isPocketBookFormat(childIssue?.format)) tbCount += 1;
    else notTbCount += 1;

    const releaseTimestamp = toDateTimestamp(childIssue?.releaseDate);
    if (isPartialPublicationStart(child.part)) {
      const nextPartial = updateEarliest(
        firstPartialChildId,
        firstPartialTimestamp,
        child,
        releaseTimestamp
      );
      firstPartialChildId = nextPartial.id;
      firstPartialTimestamp = nextPartial.timestamp;
    }

    if (isCompletePublication(child.part)) {
      const nextFull = updateEarliest(firstFullChildId, firstFullTimestamp, child, releaseTimestamp);
      firstFullChildId = nextFull.id;
      firstFullTimestamp = nextFull.timestamp;
    }
  }

  return {
    firstPartialChildId,
    firstFullChildId,
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

  for (const child of childrenInGroup) {
    const isPocketBook = isPocketBookFormat(child.issue?.format);
    const nextFirstApp =
      (analysis.firstPartialChildId != null && child.id === analysis.firstPartialChildId) ||
      (analysis.firstFullChildId != null && child.id === analysis.firstFullChildId);
    const nextOtherOnlyTb = analysis.hasOnlyOneNonTb && !isPocketBook;

    if (
      child.onlyApp !== analysis.singleRelease ||
      child.firstApp !== nextFirstApp ||
      child.otherOnlyTb !== nextOtherOnlyTb ||
      child.onlyTb !== false
    ) {
      await prisma.story.update({
        where: { id: child.id },
        data: {
          onlyApp: analysis.singleRelease,
          firstApp: nextFirstApp,
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
          format: true,
          releaseDate: true,
        },
      },
    },
  });
  const childrenByParent = buildChildrenByParent(childrenRaw as StoryWithIssue[]);

  for (const groupParentIds of parentGroups) {
    const parentsInGroup = groupParentIds
      .map((id) => parentStoryById.get(id))
      .filter((entry): entry is StoryWithRelations => Boolean(entry));

    if (parentsInGroup.length === 0) continue;

    const childrenInGroup: StoryWithIssue[] = groupParentIds.flatMap(
      (parentId) => childrenByParent.get(parentId) || []
    );
    await applyParentGroupUpdates(parentsInGroup, childrenInGroup);
  }
}

export async function updateStoryFilterFlagsForIssue(issueId: number): Promise<void> {
  const numericIssueId = toPositiveInt(issueId);
  if (numericIssueId == null) return;

  const issue = await prisma.issue.findFirst({
    where: { id: BigInt(numericIssueId) },
    select: {
      id: true,
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
  });

  const isUsIssue = Boolean(issue?.series?.publisher?.original);

  const stories = await prisma.story.findMany({
    where: { fkIssue: BigInt(numericIssueId) },
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
}
