import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { compareIssueVariants, normalizeIssueOptionalString } from "./issue-read-shared";
import {
  hasExplicitIssueVariantSelection,
  matchesIssueSelectionBySlug,
  type IssueSelectionCandidate,
  type IssueSelectionInput,
} from "./issue-selection";

const issueMetadataCandidateSelect = Prisma.validator<Prisma.IssueSelect>()({
  id: true,
  number: true,
  format: true,
  variant: true,
  series: {
    select: {
      title: true,
      volume: true,
      startYear: true,
      publisher: {
        select: {
          name: true,
          original: true,
        },
      },
    },
  },
});

const issueMetadataSelect = Prisma.validator<Prisma.IssueSelect>()({
  number: true,
  format: true,
  variant: true,
  series: {
    select: {
      title: true,
      volume: true,
      startYear: true,
      publisher: {
        select: {
          name: true,
        },
      },
    },
  },
});

function pickIssueMetadataCandidate(
  matchingCandidates: Array<IssueSelectionCandidate & { id: bigint }>,
  hasExplicitVariantSelection: boolean
) {
  const sortableCandidates = matchingCandidates as Array<{
    format?: string | null;
    variant?: string | null;
    id: bigint;
  }>;

  return (
    (hasExplicitVariantSelection
      ? matchingCandidates
      : [...sortableCandidates].sort(compareIssueVariants))[0] || null
  );
}

function getMatchingIssueMetadataCandidates(
  candidates: Array<IssueSelectionCandidate & { id: bigint }>,
  selection: IssueSelectionInput
) {
  return candidates.filter((candidate) =>
    matchesIssueSelectionBySlug(candidate as IssueSelectionCandidate, selection)
  );
}

export async function readIssueMetadataQuery(selection: IssueSelectionInput) {
  const normalizedFormat = normalizeIssueOptionalString(selection.format) ?? undefined;
  const normalizedVariant = normalizeIssueOptionalString(selection.variant) ?? undefined;
  const hasExplicitVariantSelection = hasExplicitIssueVariantSelection(selection);
  const normalizedStartYear =
    Number.isFinite(Number(selection.startyear)) && Number(selection.startyear) > 0
      ? BigInt(Number(selection.startyear))
      : undefined;

  const exactCandidates = await prisma.issue.findMany({
    where: {
      number: selection.number,
      ...(hasExplicitVariantSelection ? { format: normalizedFormat } : {}),
      ...(hasExplicitVariantSelection ? { variant: normalizedVariant } : {}),
      series: {
        title: selection.series,
        volume: BigInt(selection.volume),
        ...(normalizedStartYear ? { startYear: normalizedStartYear } : {}),
        publisher: {
          name: selection.publisher,
          original: selection.us,
        },
      },
    },
    select: issueMetadataCandidateSelect,
    orderBy: [{ id: "asc" }],
  });

  const fallbackCandidates =
    exactCandidates.length > 0
      ? []
      : await prisma.issue.findMany({
          where: {
            number: selection.number,
            ...(hasExplicitVariantSelection ? { format: normalizedFormat } : {}),
            ...(hasExplicitVariantSelection ? { variant: normalizedVariant } : {}),
            series: {
              volume: BigInt(selection.volume),
              ...(normalizedStartYear ? { startYear: normalizedStartYear } : {}),
              publisher: {
                original: selection.us,
              },
            },
          },
          select: issueMetadataCandidateSelect,
          orderBy: [{ id: "asc" }],
        });

  const resolvedCandidates = exactCandidates.length > 0 ? exactCandidates : fallbackCandidates;
  const matchingCandidates = getMatchingIssueMetadataCandidates(resolvedCandidates, selection);
  const currentCandidate = pickIssueMetadataCandidate(matchingCandidates, hasExplicitVariantSelection);

  if (!currentCandidate) return null;

  const issue = await prisma.issue.findUnique({
    where: {
      id: currentCandidate.id,
    },
    select: issueMetadataSelect,
  });

  if (!issue) return null;

  return {
    number: issue.number,
    format: issue.format || null,
    variant: issue.variant || null,
    series: issue.series
      ? {
          title: issue.series.title || null,
          startyear: issue.series.startYear === null ? null : Number(issue.series.startYear),
          volume: Number(issue.series.volume),
          publisher: issue.series.publisher
            ? {
                name: issue.series.publisher.name || null,
              }
            : null,
        }
      : null,
  };
}
