import type { Filter } from "../../types/query-data";
import type { Issue } from "../../types/domain";
import { prisma } from "../prisma/client";
import { FilterService } from "../../services/FilterService";
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

export async function readLastEditedIssues(
  filter: Filter | undefined,
  first: number | undefined,
  after: string | undefined,
  order: string | undefined,
  direction: string | undefined,
  loggedIn: boolean
) {
  void after;

  const limit = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : 25;
  const filteredIssueIds = filter ? await new FilterService().getFilteredIssueIds(filter, loggedIn) : null;
  const rows = await prisma.issue.findMany({
    where: {
      fkSeries: {
        not: null,
      },
      ...(filteredIssueIds
        ? {
            id: {
              in: filteredIssueIds.map((id) => BigInt(id)),
            },
          }
        : {}),
    },
    include: {
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
    },
    take: Math.min((limit + 1) * 5, 250),
  });

  const sortedRows = sortLastEditedRows(rows, normalizeSortField(order), normalizeSortDirection(direction));
  const grouped = new Map<string, typeof sortedRows>();
  for (const issue of sortedRows) {
    const key = `${issue.fkSeries}::${issue.number}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(issue);
  }

  const deduped = Array.from(grouped.values()).map((group) => pickPreferredIssueVariant(group));
  const pageRows = deduped.slice(0, limit + 1);
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
  const filteredIssueIds = filter ? await new FilterService().getFilteredIssueIds(filter, loggedIn) : null;
  const rows = await prisma.issue.findMany({
    where: {
      ...(filteredIssueIds
        ? {
            id: {
              in: filteredIssueIds.map((id) => BigInt(id)),
            },
          }
        : {}),
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
    serialized.variant = "";
    serialized.variants = group
      .slice()
      .sort(compareIssueVariants)
      .map((variant) => ({
        id: String(variant.id),
        collected: variant.collected ?? null,
        format: toOptionalText(variant.format),
        variant: toOptionalText(variant.variant),
      })) as any;
    return serialized;
  });

  return buildConnectionFromNodes(nodes);
}

export async function readIssuesByIds(ids: readonly number[]) {
  if (ids.length === 0) return [];

  const rows = await prisma.issue.findMany({
    where: {
      id: {
        in: ids.map((id) => BigInt(id)),
      },
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
    },
  });

  const byId = new Map(rows.map((row) => [Number(row.id), serializePreviewIssue(row)]));
  return ids.map((id) => byId.get(id) ?? null);
}
