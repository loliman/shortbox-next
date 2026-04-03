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

type IssueMetadataRecord = Prisma.IssueGetPayload<{ select: typeof issueMetadataSelect }>;

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

function buildIssueMetadataCandidateWhere(
  selection: IssueSelectionInput,
  normalizedFormat: string | undefined,
  normalizedVariant: string | undefined,
  hasExplicitVariantSelection: boolean,
  normalizedStartYear: bigint | undefined,
  exactSeriesMatch: boolean
): Prisma.IssueWhereInput {
  return {
    number: selection.number,
    ...(hasExplicitVariantSelection ? { format: normalizedFormat } : {}),
    ...(hasExplicitVariantSelection ? { variant: normalizedVariant } : {}),
    series: {
      ...(exactSeriesMatch ? { title: selection.series } : {}),
      volume: BigInt(selection.volume),
      ...(normalizedStartYear ? { startYear: normalizedStartYear } : {}),
      publisher: exactSeriesMatch
        ? {
            name: selection.publisher,
            original: selection.us,
          }
        : {
            original: selection.us,
          },
    },
  };
}

async function readIssueMetadataCandidates(
  selection: IssueSelectionInput,
  normalizedFormat: string | undefined,
  normalizedVariant: string | undefined,
  hasExplicitVariantSelection: boolean,
  normalizedStartYear: bigint | undefined,
  exactSeriesMatch: boolean
) {
  return prisma.issue.findMany({
    where: buildIssueMetadataCandidateWhere(
      selection,
      normalizedFormat,
      normalizedVariant,
      hasExplicitVariantSelection,
      normalizedStartYear,
      exactSeriesMatch
    ),
    select: issueMetadataCandidateSelect,
    orderBy: [{ id: "asc" }],
  });
}

function toResolvedIssueMetadata(issue: IssueMetadataRecord | null) {
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

export async function readIssueMetadataQuery(selection: IssueSelectionInput) {
  const normalizedFormat = normalizeIssueOptionalString(selection.format) ?? undefined;
  const normalizedVariant = normalizeIssueOptionalString(selection.variant) ?? undefined;
  const hasExplicitVariantSelection = hasExplicitIssueVariantSelection(selection);
  const normalizedStartYear = normalizeStartYear(selection.startyear);

  const exactCandidates = await readIssueMetadataCandidates(
    selection,
    normalizedFormat,
    normalizedVariant,
    hasExplicitVariantSelection,
    normalizedStartYear,
    true
  );

  const fallbackCandidates =
    exactCandidates.length > 0
      ? []
      : await readIssueMetadataCandidates(
          selection,
          normalizedFormat,
          normalizedVariant,
          hasExplicitVariantSelection,
          normalizedStartYear,
          false
        );

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

  return toResolvedIssueMetadata(issue);
}

function normalizeStartYear(startyear: IssueSelectionInput["startyear"]) {
  const numericStartYear = Number(startyear);
  if (!Number.isFinite(numericStartYear) || numericStartYear <= 0) return undefined;
  return BigInt(numericStartYear);
}
