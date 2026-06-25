import "server-only";

import { prisma } from "../prisma/client";
import { serializePreviewIssue } from "./issue-read-shared";
import { createPreviewIssueInclude } from "./issue-feed-read";
import { matchesPublisherSelectionBySlug } from "./publisher-selection";
import { readNavigationFilterState } from "./navigation-read";
import type { RouteQuery } from "../../types/route-ui";

export async function readPublisherDetailsQuery(input: {
  us: boolean;
  publisher: string;
  query?: RouteQuery | null;
}) {
  const publisher = await prisma.publisher.findFirst({
    where: {
      name: {
        equals: input.publisher,
        mode: "insensitive",
      },
      original: input.us,
    },
    include: {
      series: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const slugCandidates = publisher
    ? []
    : await prisma.publisher.findMany({
        where: {
          original: input.us,
        },
        include: {
          series: true,
        },
        orderBy: [{ id: "asc" }],
      });

  const resolvedPublisher =
    publisher ??
    slugCandidates.find((candidate) =>
      matchesPublisherSelectionBySlug(candidate, {
        us: input.us,
        publisher: input.publisher,
      })
    ) ??
    null;

  if (!resolvedPublisher) return null;

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
        series: {
          publisher: {
            id: resolvedPublisher.id,
          },
        },
      },
    }),
    prisma.issue.findMany({
      where: {
        ...filterState.directIssueWhere,
        ...filteredIssueWhere,
        series: {
          publisher: {
            id: resolvedPublisher.id,
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 50,
      include: createPreviewIssueInclude(),
    }),
  ]);

  return {
    details: {
      id: String(resolvedPublisher.id),
      name: resolvedPublisher.name,
      us: resolvedPublisher.original,
      addinfo: resolvedPublisher.addInfo || null,
      startyear: Number(resolvedPublisher.startYear),
      endyear: resolvedPublisher.endYear === null ? null : Number(resolvedPublisher.endYear),
      active: resolvedPublisher.endYear === null || Number(resolvedPublisher.endYear) === 0,
      seriesCount: resolvedPublisher.series.length,
      issueCount,
      lastEdited: [],
    },
    issues: recentIssues.map((issue) => serializePreviewIssue(issue)),
  };
}
