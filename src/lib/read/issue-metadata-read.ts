import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { normalizeIssueOptionalString } from "./issue-read-shared";
import {
  hasExplicitIssueVariantSelection,
  matchesIssueSelectionBySlug,
  matchVariantBySlug,
  type IssueSelectionCandidate,
  type IssueSelectionInput,
} from "./issue-selection";

const issueMetadataCandidateSelect = Prisma.validator<Prisma.IssueSelect>()({
  id: true,
  number: true,
  variants: {
    select: {
      format: true,
      variantLabel: true,
    },
  },
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
  variants: {
    select: {
      format: true,
      variantLabel: true,
    },
    orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
    take: 1,
  },
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
type IssueMetadataCandidate = Prisma.IssueGetPayload<{ select: typeof issueMetadataCandidateSelect }>;

function pickIssueMetadataCandidate(
  matchingCandidates: IssueMetadataCandidate[],
  selection: IssueSelectionInput,
  hasExplicitVariantSelection: boolean
): IssueMetadataCandidate | null {
  if (hasExplicitVariantSelection) {
    // Find a candidate that has a matching variant
    return (
      matchingCandidates.find((c) => matchVariantBySlug(c as IssueSelectionCandidate, selection) !== null) ??
      matchingCandidates[0] ??
      null
    );
  }
  return matchingCandidates[0] ?? null;
}

function getMatchingIssueMetadataCandidates(
  candidates: IssueMetadataCandidate[],
  selection: IssueSelectionInput
) {
  return candidates.filter((candidate) =>
    matchesIssueSelectionBySlug(candidate as IssueSelectionCandidate, selection)
  );
}

function buildIssueMetadataCandidateWhere(
  selection: IssueSelectionInput,
  normalizedStartYear: bigint | undefined,
  exactSeriesMatch: boolean
): Prisma.IssueWhereInput {
  return {
    number: selection.number,
    series: {
      ...(exactSeriesMatch ? { title: selection.series } : {}),
      volume: BigInt(selection.volume),
      ...(normalizedStartYear ? { startYear: { in: [normalizedStartYear, 0n] } } : {}),
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
  normalizedStartYear: bigint | undefined,
  exactSeriesMatch: boolean
) {
  return prisma.issue.findMany({
    where: buildIssueMetadataCandidateWhere(selection, normalizedStartYear, exactSeriesMatch),
    select: issueMetadataCandidateSelect,
    orderBy: [{ id: "asc" }],
  });
}

function resolveMatchedVariant(
  issue: IssueMetadataRecord,
  selection: IssueSelectionInput,
  hasExplicit: boolean
): { format: string; variantLabel: string | null } | null {
  if (!hasExplicit) {
    return issue.variants[0] ?? null;
  }

  const expectedFormat = normalizeIssueOptionalString(selection.format);
  const expectedVariant = normalizeIssueOptionalString(selection.variant);

  return (
    issue.variants.find(
      (v) =>
        (expectedFormat === null || v.format.toLowerCase() === (expectedFormat ?? "").toLowerCase()) &&
        ((expectedVariant === null && !v.variantLabel) ||
          v.variantLabel?.toLowerCase() === (expectedVariant ?? "").toLowerCase())
    ) ?? issue.variants[0] ?? null
  );
}

function toResolvedIssueMetadata(
  issue: IssueMetadataRecord | null,
  matchedVariant: { format: string; variantLabel: string | null } | null
) {
  if (!issue) return null;

  return {
    number: issue.number,
    format: matchedVariant?.format || null,
    variant: matchedVariant?.variantLabel || null,
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
  const hasExplicitVariantSelection = hasExplicitIssueVariantSelection(selection);
  const normalizedStartYear = normalizeStartYear(selection.startyear);

  const exactCandidates = await readIssueMetadataCandidates(selection, normalizedStartYear, true);

  const fallbackCandidates =
    exactCandidates.length > 0
      ? []
      : await readIssueMetadataCandidates(selection, normalizedStartYear, false);

  const resolvedCandidates = exactCandidates.length > 0 ? exactCandidates : fallbackCandidates;
  const matchingCandidates = getMatchingIssueMetadataCandidates(resolvedCandidates, selection);
  const currentCandidate = pickIssueMetadataCandidate(
    matchingCandidates,
    selection,
    hasExplicitVariantSelection
  );

  if (!currentCandidate) return null;

  const issue = await prisma.issue.findUnique({
    where: {
      id: currentCandidate.id,
    },
    select: issueMetadataSelect,
  });

  const matchedVariant = resolveMatchedVariant(issue!, selection, hasExplicitVariantSelection);
  return toResolvedIssueMetadata(issue, matchedVariant);
}

function normalizeStartYear(startyear: IssueSelectionInput["startyear"]) {
  const numericStartYear = Number(startyear);
  if (!Number.isFinite(numericStartYear) || numericStartYear <= 0) return undefined;
  return BigInt(numericStartYear);
}
