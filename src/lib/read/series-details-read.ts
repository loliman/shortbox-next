import "server-only";

import { prisma } from "../prisma/client";
import { serializePreviewIssue } from "./issue-read-shared";
import { createPreviewIssueInclude } from "./issue-feed-read";
import { matchesSeriesSelectionBySlug, type SeriesSelectionInput } from "./series-selection";
import { readNavigationFilterState } from "./navigation-read";
import type { RouteQuery } from "../../types/route-ui";

export async function readSeriesDetailsQuery(
  input: SeriesSelectionInput & { query?: RouteQuery | null }
) {
  const normalizedStartYear =
    Number.isFinite(Number(input.startyear)) && Number(input.startyear) > 0
      ? BigInt(Number(input.startyear))
      : undefined;
  const series = await prisma.series.findFirst({
    where: {
      title: input.series,
      volume: BigInt(input.volume),
      ...(normalizedStartYear ? { startYear: { in: [normalizedStartYear, 0n] } } : {}),
      publisher: {
        name: input.publisher,
        original: input.us,
      },
    },
    include: {
      publisher: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const slugCandidates = series
    ? []
    : await prisma.series.findMany({
        where: {
          volume: BigInt(input.volume),
          ...(normalizedStartYear ? { startYear: { in: [normalizedStartYear, 0n] } } : {}),
          publisher: {
            original: input.us,
          },
        },
        include: {
          publisher: true,
        },
        orderBy: [{ id: "asc" }],
      });

  const resolvedSeries =
    series ?? slugCandidates.find((candidate) => matchesSeriesSelectionBySlug(candidate, input)) ?? null;

  if (!resolvedSeries) return null;

  const filterState = await readNavigationFilterState(
    typeof input.query?.filter === "string" ? input.query.filter : null,
    input.us
  );

  const filteredIssueWhere = filterState.filteredIssueIds
    ? {
        id: {
          in: filterState.filteredIssueIds,
        },
      }
    : undefined;

  const [issueCount, recentIssues] = await Promise.all([
    prisma.issue.count({
      where: {
        ...filterState.directIssueWhere,
        ...filteredIssueWhere,
        fkSeries: resolvedSeries.id,
      },
    }),
    prisma.issue.findMany({
      where: {
        ...filterState.directIssueWhere,
        ...filteredIssueWhere,
        fkSeries: resolvedSeries.id,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 50,
      include: createPreviewIssueInclude(),
    }),
  ]);

  return {
    details: {
      id: String(resolvedSeries.id),
      title: resolvedSeries.title || null,
      startyear: Number(resolvedSeries.startYear),
      endyear: resolvedSeries.endYear === null ? null : Number(resolvedSeries.endYear),
      volume: Number(resolvedSeries.volume),
      genre: resolvedSeries.genre || null,
      addinfo: resolvedSeries.addInfo || null,
      issueCount,
      active: resolvedSeries.endYear === null || Number(resolvedSeries.endYear) === 0,
      lastEdited: [],
      publisher: resolvedSeries.publisher
        ? {
            id: String(resolvedSeries.publisher.id),
            name: resolvedSeries.publisher.name,
            us: resolvedSeries.publisher.original,
          }
        : null,
    },
    issues: recentIssues.map((issue) => serializePreviewIssue(issue)),
  };
}
