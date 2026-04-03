import "server-only";

import type { Filter } from "../../types/query-data";
import type { Issue } from "../../types/domain";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { resolveFilterState } from "./filter-read";
import {
  buildConnectionFromNodes,
  compareIssueNumber,
  compareIssueVariants,
  normalizeSortDirection,
  normalizeSortField,
  normalizeText,
  pickPreferredIssueVariant,
  serializeNavbarIssue,
  serializePreviewIssue,
  sortLastEditedRows,
  toOptionalText,
} from "./issue-read-shared";

type SeriesInput = {
  title?: string | null;
  volume?: number | null;
  publisher?: {
    name?: string | null;
    us?: boolean | null;
  } | null;
};

type FeedCursorField = "updatedat" | "createdat" | "id";

type FeedCursor = {
  field: FeedCursorField;
  direction: "asc" | "desc";
  value: string | number;
  id: number;
};

type FeedAnchorRow = {
  id: bigint;
  fkSeries: bigint | null;
  number: string;
  createdAt: Date;
  updatedAt: Date;
};

function getFeedCursorField(field?: string | null): FeedCursorField | null {
  const normalized = normalizeSortField(field);
  if (normalized === "updatedat" || normalized === "createdat" || normalized === "id") {
    return normalized;
  }
  return null;
}

function encodeFeedCursor(cursor: FeedCursor | null) {
  if (!cursor) return null;
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeFeedCursor(after: string | undefined, field: FeedCursorField, direction: "asc" | "desc") {
  if (!after) return null;
  try {
    const parsed = JSON.parse(Buffer.from(after, "base64url").toString("utf8")) as Partial<FeedCursor>;
    if (parsed.field !== field || parsed.direction !== direction) return null;
    if (typeof parsed.id !== "number") return null;
    if (typeof parsed.value !== "string" && typeof parsed.value !== "number") return null;
    return parsed as FeedCursor;
  } catch {
    return null;
  }
}

function createFeedAnchorCursor(
  row: FeedAnchorRow | undefined,
  field: FeedCursorField,
  direction: "asc" | "desc"
) {
  if (!row) return null;
  let value: string | number = Number(row.id);
  if (field === "updatedat") {
    value = row.updatedAt.toISOString();
  } else if (field === "createdat") {
    value = row.createdAt.toISOString();
  }

  return encodeFeedCursor({
    field,
    direction,
    value,
    id: Number(row.id),
  });
}

function createFeedOrderBy(field: FeedCursorField, direction: "asc" | "desc"): Prisma.IssueOrderByWithRelationInput[] {
  switch (field) {
    case "createdat":
      return [{ createdAt: direction }, { id: direction }];
    case "id":
      return [{ id: direction }];
    default:
      return [{ updatedAt: direction }, { id: direction }];
  }
}

function createFeedCursorWhere(cursor: FeedCursor | null, field: FeedCursorField, direction: "asc" | "desc") {
  if (!cursor) return null;
  const operator = direction === "asc" ? "gt" : "lt";

  if (field === "id") {
    return {
      id: {
        [operator]: BigInt(cursor.id),
      },
    } as Prisma.IssueWhereInput;
  }

  const column = field === "createdat" ? "createdAt" : "updatedAt";
  const cursorDate = new Date(String(cursor.value));
  if (Number.isNaN(cursorDate.getTime())) return null;

  return {
    OR: [
      {
        [column]: {
          [operator]: cursorDate,
        },
      },
      {
        [column]: cursorDate,
        id: {
          [operator]: BigInt(cursor.id),
        },
      },
    ],
  } as Prisma.IssueWhereInput;
}

function createPreviewIssueInclude() {
  return Prisma.validator<Prisma.IssueInclude>()({
    series: {
      include: {
        publisher: true,
      },
    },
    stories: {
      include: {
        parent: {
          select: {
            id: true,
            collectedMultipleTimes: true,
            children: {
              select: {
                id: true,
              },
            },
          },
        },
        children: {
          select: {
            id: true,
            issue: {
              select: {
                collected: true,
              },
            },
          },
        },
        reprint: {
          select: {
            id: true,
          },
        },
        reprintedBy: {
          select: {
            id: true,
          },
        },
      },
    },
    covers: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      take: 1,
    },
  });
}

export async function readLastEditedIssues(
  filter: Filter | undefined,
  first: number | undefined,
  after: string | undefined,
  order: string | undefined,
  direction: string | undefined
) {
  const limit = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : 25;
  const sortField = normalizeSortField(order);
  const sortDirection = normalizeSortDirection(direction);
  const cursorField = getFeedCursorField(sortField);
  const filterState = await resolveFilterState(filter);
  const directFilterWhere = filterState.directIssueWhere;
  const filteredIssueIds = filterState.filteredIssueIds;
  const filteredIssueWhere = filteredIssueIds
    ? {
        id: {
          in: filteredIssueIds.map(BigInt),
        },
      }
    : undefined;
  const where: Prisma.IssueWhereInput = {
    fkSeries: {
      not: null,
    },
    ...directFilterWhere,
    ...filteredIssueWhere,
  };

  if (cursorField) {
    const anchorCursor = decodeFeedCursor(after, cursorField, sortDirection);
    const cursorWhere = createFeedCursorWhere(anchorCursor, cursorField, sortDirection);
    const rows = await prisma.issue.findMany({
      where: {
        AND: [where, ...(cursorWhere ? [cursorWhere] : [])],
      },
      include: createPreviewIssueInclude(),
      orderBy: createFeedOrderBy(cursorField, sortDirection),
      take: limit + 1,
    });

    const pageRows = rows.slice(0, limit);
    const nodes = pageRows.map((row) => serializePreviewIssue(row));
    const connection = buildConnectionFromNodes(nodes);
    connection.pageInfo.hasNextPage = rows.length > limit;
    connection.pageInfo.endCursor = createFeedAnchorCursor(
      pageRows.at(-1),
      cursorField,
      sortDirection
    );
    return connection;
  }

  const rows = await prisma.issue.findMany({
    where,
    include: createPreviewIssueInclude(),
    take: Math.min((limit + 1) * 5, 250),
  });

  const sortedRows = sortLastEditedRows(rows, normalizeSortField(order), normalizeSortDirection(direction));
  const pageRows = sortedRows.slice(0, limit + 1);
  const hasNextPage = pageRows.length > limit;
  const nodes = pageRows.slice(0, limit).map((row) => serializePreviewIssue(row));
  const connection = buildConnectionFromNodes(nodes);
  connection.pageInfo.hasNextPage = hasNextPage;
  return connection;
}

export async function readIssueNavigationNodes(
  pattern: string | undefined,
  series: SeriesInput,
  first: number | undefined,
  after: string | undefined,
  loggedIn: boolean,
  filter: Filter | undefined
) {
  void after;

  const normalizedPattern = normalizeText(pattern);
  const take = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : undefined;
  const filterState = await resolveFilterState(filter);
  const directFilterWhere = filterState.directIssueWhere;
  const filteredIssueIds = filterState.filteredIssueIds;
  const filteredIssueWhere = filteredIssueIds
    ? {
        id: {
          in: filteredIssueIds.map(BigInt),
        },
      }
    : undefined;
  const rows = await prisma.issue.findMany({
    where: {
      ...directFilterWhere,
      ...filteredIssueWhere,
      series: {
        title: normalizeText(series.title),
        volume: BigInt(Number(series.volume ?? 0)),
        publisher: {
          name: normalizeText(series.publisher?.name),
          ...(typeof series.publisher?.us === "boolean" ? { original: series.publisher.us } : {}),
        },
      },
      ...(normalizedPattern
        ? {
            OR: [
              { number: { startsWith: normalizedPattern, mode: "insensitive" } },
              { title: { contains: normalizedPattern, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      series: {
        include: {
          publisher: true,
        },
      },
      covers: {
        orderBy: [{ number: "asc" }, { id: "asc" }],
        take: 1,
      },
    },
    ...(take ? { take: take * 5 } : {}),
  });

  const sortedRows = [...rows].sort((left, right) => {
    const numberSort = compareIssueNumber(left.number, right.number);
    if (numberSort !== 0) return numberSort;
    return compareIssueVariants(left, right);
  });

  const grouped = new Map<string, typeof sortedRows>();
  for (const issue of sortedRows) {
    const key = `${issue.fkSeries}::${issue.number}`;
    const current = grouped.get(key) || [];
    current.push(issue);
    grouped.set(key, current);
  }

  const nodes: Issue[] = Array.from(grouped.values()).map((group) => {
    const primary = pickPreferredIssueVariant(group);
    const serialized = serializeNavbarIssue(primary);
    serialized.variants = group
      .slice()
      .sort(compareIssueVariants)
      .map((variant) => ({
        id: String(variant.id),
        number: primary.number,
        collected: variant.collected ?? null,
        format: toOptionalText(variant.format),
        variant: toOptionalText(variant.variant),
        series: serialized.series,
      }));
    return serialized;
  });

  return buildConnectionFromNodes(nodes);
}

export async function readIssuesByIds(ids: readonly number[]) {
  if (ids.length === 0) return [];

  const rows = await prisma.issue.findMany({
    where: {
      id: {
        in: ids.map(BigInt),
      },
    },
    include: createPreviewIssueInclude(),
  });

  const byId = new Map(rows.map((row) => [Number(row.id), serializePreviewIssue(row)]));
  return ids.map((id) => byId.get(id) ?? null);
}
