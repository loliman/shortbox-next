/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { Prisma } from "@prisma/client";
import { env } from "../env";
import { prisma } from "../prisma/client";
import {
  compareIssueVariants,
  normalizeText,
  pickCanonicalIssueTitle,
  pickPreferredIssueVariant,
  serializeIssueDate,
  serializeIssueId,
  serializeNullableIssueId,
  serializeNullableIssueNumber,
} from "./issue-read-shared";
import {
  matchesIssueSelectionBySlug,
  matchVariantBySlug,
  hasExplicitIssueVariantSelection,
  type IssueSelectionCandidate,
  type IssueSelectionInput,
} from "./issue-selection";

// ---------------------------------------------------------------------------
// Story include (unchanged – stories still live on Issue)
// ---------------------------------------------------------------------------

const issueDetailsStoryInclude = Prisma.validator<Prisma.StoryInclude>()({
  issue: {
    include: {
      series: {
        include: {
          publisher: true,
        },
      },
      variants: {
        orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
        include: {
          covers: {
            orderBy: [{ number: "asc" }, { id: "asc" }],
            take: 1,
            include: {
              individuals: {
                include: {
                  individual: true,
                },
              },
            },
          },
        },
      },
    },
  },
  reprint: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
          variants: {
            orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
            include: {
              covers: {
                orderBy: [{ number: "asc" }, { id: "asc" }],
                take: 1,
                include: {
                  individuals: {
                    include: {
                      individual: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
              variants: {
                orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
                include: {
                  covers: {
                    orderBy: [{ number: "asc" }, { id: "asc" }],
                    take: 1,
                    include: {
                      individuals: {
                        include: {
                          individual: true,
                        },
                      },
                    },
                  },
                },
              },
              _count: {
                select: {
                  stories: true,
                },
              },
            },
          },
        },
      },
    },
  },
  reprintedBy: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
          variants: {
            orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
            include: {
              covers: {
                orderBy: [{ number: "asc" }, { id: "asc" }],
                take: 1,
                include: {
                  individuals: {
                    include: {
                      individual: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
              variants: {
                orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
                include: {
                  covers: {
                    orderBy: [{ number: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                },
              },
              _count: {
                select: {
                  stories: true,
                },
              },
            },
          },
        },
      },
    },
  },
  children: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
          variants: {
            orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
            include: {
              covers: {
                orderBy: [{ number: "asc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
              variants: {
                orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
                include: {
                  covers: {
                    orderBy: [{ number: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                },
              },
              _count: {
                select: {
                  stories: true,
                },
              },
            },
          },
        },
      },
    },
  },
  parent: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
          arcs: {
            include: {
              arc: true,
            },
          },
          variants: {
            orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
            include: {
              covers: {
                orderBy: [{ number: "asc" }, { id: "asc" }],
                take: 1,
                include: {
                  individuals: {
                    include: {
                      individual: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              stories: true,
            },
          },
        },
      },
      children: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
              variants: {
                orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
                include: {
                  covers: {
                    orderBy: [{ number: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
      reprintedBy: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
              variants: {
                orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
                include: {
                  covers: {
                    orderBy: [{ number: "asc" }, { id: "asc" }],
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
      individuals: {
        include: {
          individual: true,
        },
      },
      appearances: {
        include: {
          appearance: true,
        },
      },
    },
  },
  individuals: {
    include: {
      individual: true,
    },
  },
  appearances: {
    include: {
      appearance: true,
    },
  },
});

// ---------------------------------------------------------------------------
// Candidate select: Issue with variants for format/variantLabel matching
// ---------------------------------------------------------------------------

const issueSelectionCandidateSelect = Prisma.validator<Prisma.IssueSelect>()({
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

// ---------------------------------------------------------------------------
// Full issue include for details page
// ---------------------------------------------------------------------------

function createIssueDetailsInclude() {
  return Prisma.validator<Prisma.IssueInclude>()({
    series: {
      include: {
        publisher: true,
      },
    },
    stories: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: issueDetailsStoryInclude,
    },
    arcs: {
      include: {
        arc: true,
      },
    },
    individuals: {
      include: {
        individual: true,
      },
    },
    variants: {
      orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
      include: {
        covers: {
          orderBy: [{ number: "asc" }, { id: "asc" }],
          include: {
            individuals: {
              include: {
                individual: true,
              },
            },
          },
        },
      },
    },
    _count: {
      select: {
        stories: true,
      },
    },
  });
}

function createIssueStoryOwnerInclude() {
  return Prisma.validator<Prisma.IssueInclude>()({
    series: {
      include: {
        publisher: true,
      },
    },
    stories: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: issueDetailsStoryInclude,
    },
    arcs: {
      include: {
        arc: true,
      },
    },
    individuals: {
      include: {
        individual: true,
      },
    },
    variants: {
      orderBy: [{ format: "asc" }, { variantLabel: "asc" }, { id: "asc" }],
      include: {
        covers: {
          orderBy: [{ number: "asc" }, { id: "asc" }],
          include: {
            individuals: {
              include: {
                individual: true,
              },
            },
          },
        },
      },
    },
  });
}

function createIssueStorySelectedVariantInclude() {
  return Prisma.validator<Prisma.VariantInclude>()({
    covers: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: {
        individuals: {
          include: {
            individual: true,
          },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Candidate resolution helpers
// ---------------------------------------------------------------------------

function getMatchingIssueCandidates(
  candidates: Array<IssueSelectionCandidate & { id: bigint }>,
  selection: IssueSelectionInput
) {
  return candidates.filter((candidate) =>
    matchesIssueSelectionBySlug(candidate as IssueSelectionCandidate, selection)
  );
}

function pickCurrentIssueCandidate(
  matchingCandidates: Array<IssueSelectionCandidate & { id: bigint }>,
  hasExplicitVariantSelection: boolean,
  selection: IssueSelectionInput
) {
  if (hasExplicitVariantSelection) {
    // Find the candidate that has a matching variant
    return matchingCandidates.find(
      (c) => matchVariantBySlug(c, selection) !== null
    ) ?? matchingCandidates[0] ?? null;
  }
  // No explicit variant in URL – pick first candidate (they all have the same number)
  return matchingCandidates[0] ?? null;
}

// ---------------------------------------------------------------------------
// Main read function
// ---------------------------------------------------------------------------

export async function readIssueDetails(selection: IssueSelectionInput) {
  const hasExplicitVariantSelection = hasExplicitIssueVariantSelection(selection);
  const normalizedStartYear =
    Number.isFinite(Number(selection.startyear)) && Number(selection.startyear) > 0
      ? BigInt(Number(selection.startyear))
      : undefined;

  const exactCandidates = await prisma.issue.findMany({
    where: {
      number: selection.number,
      series: {
        title: selection.series,
        volume: BigInt(selection.volume),
        ...(normalizedStartYear ? { startYear: { in: [normalizedStartYear, 0n] } } : {}),
        publisher: {
          name: selection.publisher,
          original: selection.us,
        },
      },
    },
    select: issueSelectionCandidateSelect,
    orderBy: [{ id: "asc" }],
  });

  const fallbackCandidates =
    exactCandidates.length > 0
      ? []
      : await prisma.issue.findMany({
          where: {
            number: selection.number,
            series: {
              volume: BigInt(selection.volume),
              ...(normalizedStartYear ? { startYear: { in: [normalizedStartYear, 0n] } } : {}),
              publisher: {
                original: selection.us,
              },
            },
          },
          select: issueSelectionCandidateSelect,
          orderBy: [{ id: "asc" }],
        });

  const resolvedCandidates = exactCandidates.length > 0 ? exactCandidates : fallbackCandidates;
  const matchingCandidates = getMatchingIssueCandidates(resolvedCandidates, selection);
  const currentCandidate = pickCurrentIssueCandidate(matchingCandidates, hasExplicitVariantSelection, selection);

  const current = currentCandidate
    ? await prisma.issue.findUnique({
        where: {
          id: currentCandidate.id,
        },
        include: createIssueDetailsInclude(),
      })
    : null;

  if (!current) {
    if (env.NODE_ENV === "development") {
      console.warn("readIssueDetails miss", {
        selection,
        hasExplicitVariantSelection,
        candidateCount: resolvedCandidates.length,
        matchingCandidateCount: matchingCandidates.length,
        candidates: resolvedCandidates.slice(0, 10).map((candidate) => ({
          number: candidate.number,
          variants: candidate.variants?.map((v) => ({ format: v.format, variantLabel: v.variantLabel })),
          series: candidate.series?.title,
          volume: Number(candidate.series?.volume || 0),
          publisher: candidate.series?.publisher?.name,
          original: candidate.series?.publisher?.original,
        })),
      });
    }
    return null;
  }

  // Identify the selected variant from the URL
  const selectedVariant = hasExplicitVariantSelection
    ? current.variants.find(
        (v) =>
          matchVariantBySlug(
            { variants: current.variants, number: current.number, series: current.series },
            selection
          ) !== null &&
          matchVariantBySlug({ variants: [v], number: current.number, series: current.series }, selection) !== null
      ) ?? pickPreferredIssueVariant(current.variants)
    : pickPreferredIssueVariant(current.variants);

  return toIssueDetailsShape(current, selectedVariant ?? null);
}

// ---------------------------------------------------------------------------
// Shape serializers
// ---------------------------------------------------------------------------

function toIssueDetailsShape(issue: any, selectedVariant: any) {
  const sortedVariants = [...issue.variants].sort(compareIssueVariants);
  const preferredVariant = sortedVariants[0] ?? null;
  const activeVariant = selectedVariant ?? preferredVariant;

  const resolvedTitle =
    pickCanonicalIssueTitle([issue], issue.title) ||
    issue.title ||
    null;

  const mappedVariants = sortedVariants.map((variant: any) => ({
    id: serializeIssueId(variant.id),
    format: variant.format || null,
    variant: variant.variantLabel || null,
    releasedate: serializeIssueDate(variant.releaseDate),
    verified: variant.verified,
    collected: variant.collected ?? null,
    comicguideid: serializeNullableIssueId(variant.comicGuideId),
    cover: variant.covers[0] ? toIssueCoverShape(variant.covers[0]) : null,
    series: toIssueSeriesShape(issue.series),
    // Keep number/legacy_number for backward compat in variant list
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    title: issue.title || null,
  }));

  return {
    id: serializeIssueId(issue.id),
    variantId: activeVariant ? serializeIssueId(activeVariant.id) : null,
    title: resolvedTitle,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    // Active variant fields (the one selected via URL or preferred)
    format: activeVariant?.format || null,
    variant: activeVariant?.variantLabel || null,
    releasedate: serializeIssueDate(activeVariant?.releaseDate),
    pages: serializeNullableIssueNumber(activeVariant?.pages),
    price: activeVariant?.price ? Number(activeVariant.price) : null,
    currency: activeVariant?.currency || null,
    isbn: activeVariant?.isbn || null,
    limitation:
      activeVariant?.limitation === null || activeVariant?.limitation === undefined
        ? null
        : String(activeVariant.limitation),
    addinfo: activeVariant?.addInfo || null,
    verified: activeVariant?.verified ?? false,
    collected: activeVariant?.collected ?? null,
    comicguideid: serializeNullableIssueId(activeVariant?.comicGuideId),
    // Issue-level fields
    createdat: serializeIssueDate(issue.createdAt),
    updatedat: serializeIssueDate(issue.updatedAt),
    series: toIssueSeriesShape(issue.series),
    stories: (issue.stories ?? []).map((story: any) => toIssueDetailsStoryShape(story)),
    cover: activeVariant?.covers[0] ? toIssueCoverShape(activeVariant.covers[0]) : null,
    individuals: (issue.individuals ?? []).map(toIssueIndividualEntryShape),
    arcs: (issue.arcs ?? []).map((entry: any) => ({
      id: serializeIssueId(entry.arc.id),
      title: entry.arc.title || null,
      type: entry.arc.type || null,
    })),
    variants: mappedVariants,
    // Simplified: no more storyOwner / inheritsStories – stories always on Issue
    storyOwner: null,
    storyOwnerId: serializeIssueId(issue.id),
    inheritsStories: false,
    tags: [],
  };
}

function toIssueDetailsStoryShape(story: any) {
  const mappedStory = toIssueStoryShape(story, true);

  if (!mappedStory.parent?.issue) return mappedStory;

  return {
    ...mappedStory,
    parent: {
      ...mappedStory.parent,
      issue: {
        ...mappedStory.parent.issue,
        arcs: Array.isArray(story.parent?.issue?.arcs)
          ? story.parent.issue.arcs.map((entry: any) => ({
              id: serializeIssueId(entry.arc.id),
              title: entry.arc.title || null,
              type: entry.arc.type || null,
            }))
          : [],
      },
    },
  };
}

function toIssueSeriesShape(series: any) {
  if (!series) return null;

  return {
    id: serializeIssueId(series.id),
    title: series.title || null,
    startyear: serializeNullableIssueNumber(series.startYear),
    endyear: serializeNullableIssueNumber(series.endYear),
    volume: serializeNullableIssueNumber(series.volume),
    genre: series.genre || null,
    addinfo: series.addInfo || null,
    publisher: series.publisher
      ? {
          id: serializeIssueId(series.publisher.id),
          name: series.publisher.name || null,
          us: series.publisher.original,
          addinfo: series.publisher.addInfo || null,
          startyear: serializeNullableIssueNumber(series.publisher.startYear),
          endyear: serializeNullableIssueNumber(series.publisher.endYear),
        }
      : null,
  };
}

function toIssueReferenceShape(issue: any) {
  if (!issue) return null;

  const preferredVariant = issue.variants
    ? [...issue.variants].sort(compareIssueVariants)[0]
    : null;

  return {
    id: serializeIssueId(issue.id),
    title: issue.title || null,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    format: preferredVariant?.format || null,
    variant: preferredVariant?.variantLabel || null,
    releasedate: serializeIssueDate(preferredVariant?.releaseDate),
    collected: preferredVariant?.collected ?? null,
    comicguideid: serializeNullableIssueNumber(preferredVariant?.comicGuideId),
    cover: preferredVariant?.covers?.[0] ? toIssueCoverShape(preferredVariant.covers[0]) : null,
    series: toIssueSeriesShape(issue.series),
    individuals: Array.isArray(issue.individuals)
      ? issue.individuals.map(toIssueIndividualEntryShape)
      : [],
    storiesCount: issue._count?.stories ?? (Array.isArray(issue.stories) ? issue.stories.length : 1),
  };
}

function toIssueCoverShape(cover: any) {
  return {
    id: serializeIssueId(cover.id),
    url: cover.url || null,
    number: serializeNullableIssueNumber(cover.number),
    addinfo: cover.addInfo || null,
    individuals: Array.isArray(cover.individuals)
      ? cover.individuals.map((entry: any) => ({
          id: serializeIssueId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
  };
}

function toIssueIndividualEntryShape(entry: any) {
  return {
    id: serializeIssueId(entry.individual.id),
    name: entry.individual.name || null,
    type: entry.type || "",
  };
}

function toReleaseDateTimestamp(value: unknown): number {
  if (value instanceof Date) return value.getTime();

  const parsed = new Date(normalizeText(value)).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function compareStoryIssueReferencesByReleaseDate(left: any, right: any) {
  // releaseDate now comes from the preferred variant
  const leftDate = toReleaseDateTimestamp(
    left?.issue?.variants?.[0]?.releaseDate ?? left?.issue?.releaseDate
  );
  const rightDate = toReleaseDateTimestamp(
    right?.issue?.variants?.[0]?.releaseDate ?? right?.issue?.releaseDate
  );
  const releaseDateCompare = leftDate - rightDate;
  if (releaseDateCompare !== 0) return releaseDateCompare;

  const issueNumberCompare = normalizeText(left?.issue?.number).localeCompare(
    normalizeText(right?.issue?.number),
    undefined,
    { numeric: true, sensitivity: "base" }
  );
  if (issueNumberCompare !== 0) return issueNumberCompare;

  return Number(left?.issue?.id ?? left?.id ?? 0) - Number(right?.issue?.id ?? right?.id ?? 0);
}

function sortStoryIssueReferencesByReleaseDate<T>(references: T[] | null | undefined): T[] {
  return Array.isArray(references) ? [...references].sort(compareStoryIssueReferencesByReleaseDate) : [];
}

function toIssueStoryShape(story: any, includeParent: boolean, issueOverride?: any, customChildren?: any[]) {
  const childrenSource = customChildren ?? story.children;
  return {
    id: serializeIssueId(story.id),
    number: serializeNullableIssueNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    exclusive: !story.parent,
    onlyapp: story.onlyApp,
    firstapp: story.firstApp,
    firstCompleteApp: story.firstCompleteApp,
    firstPartialApp: story.firstPartialApp,
    onlytb: story.onlyTb,
    otheronlytb: story.otherOnlyTb,
    onlyoneprint: story.onlyOnePrint,
    collected: story.collected,
    collectedmultipletimes: story.collectedMultipleTimes,
    issue: toIssueReferenceShape(issueOverride || story.issue),
    parent: includeParent ? toIssueParentStoryShape(story.parent) : null,
    reprintOf: story.reprint ? toIssueStoryReferenceShape(story.reprint) : null,
    reprints: sortStoryIssueReferencesByReleaseDate(story.reprintedBy).map(toIssueStoryReferenceShape),
    children: sortStoryIssueReferencesByReleaseDate(childrenSource).map(toIssueStoryReferenceShape),
    individuals: Array.isArray(story.individuals)
      ? story.individuals.map((entry: any) => ({
          id: serializeIssueId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
    appearances: Array.isArray(story.appearances)
      ? story.appearances.map((entry: any) => ({
          id: serializeIssueId(entry.appearance.id),
          name: entry.appearance.name || null,
          type: entry.appearance.type || "",
          role: entry.role || "",
        }))
      : [],
  };
}

/**
 * Loads stories for the selected issue (always the issue itself after migration).
 * `storyOwnerId` is kept for backward compat but now always equals `selectedIssueId`.
 */
export async function readIssueDetailStories(input: {
  selectedIssueId: string | number;
  storyOwnerId?: string | number | null;
}) {
  const issueId = BigInt(String(input.storyOwnerId ?? input.selectedIssueId));

  const issue = await prisma.issue.findUnique({
    where: {
      id: issueId,
    },
    include: createIssueStoryOwnerInclude(),
  });

  if (!issue || !Array.isArray(issue.stories)) return [];

  // Select which variant to show as the "context" for the stories
  const selectedVariantId = input.selectedIssueId !== input.storyOwnerId
    ? null
    : null; // Both point to the same issue now

  const selectedVariant = selectedVariantId
    ? await prisma.variant.findUnique({
        where: { id: BigInt(String(selectedVariantId)) },
        include: createIssueStorySelectedVariantInclude(),
      })
    : null;

  const issueOverride = selectedVariant
    ? { ...issue, variants: [selectedVariant] }
    : issue;

  const storyIds = issue.stories.map((story: any) => story.id);
  const storyToChildren = new Map<number, any[]>();

  if (storyIds.length > 0) {
    try {
      // 1. Walk up to get root IDs for each target story
      const roots = await prisma.$queryRaw<Array<{ target_id: string | bigint; root_id: string | bigint }>>`
        WITH RECURSIVE reprint_up AS (
          SELECT id as target_id, id, fk_reprint 
          FROM shortbox.story 
          WHERE id IN (${Prisma.join(storyIds)})
          
          UNION ALL
          
          SELECT ru.target_id, s.id, s.fk_reprint 
          FROM shortbox.story s
          INNER JOIN reprint_up ru ON s.id = ru.fk_reprint
        )
        SELECT target_id, id as root_id 
        FROM reprint_up 
        WHERE fk_reprint IS NULL
      `;

      // Create mappings
      const targetToRoot = new Map<number, number>();
      const rootIds: bigint[] = [];
      for (const row of roots) {
        const target = Number(row.target_id);
        const root = Number(row.root_id);
        targetToRoot.set(target, root);
        rootIds.push(BigInt(root));
      }

      const rootToDescendants = new Map<number, Set<number>>();
      const allRelatedStoryIds: bigint[] = [];
      
      if (rootIds.length > 0) {
        const uniqueRootIds = Array.from(new Set(rootIds));
        // 2. Walk down to get all descendants of these roots
        const descendants = await prisma.$queryRaw<Array<{ root_id: string | bigint; id: string | bigint }>>`
          WITH RECURSIVE reprint_down AS (
            SELECT id as root_id, id 
            FROM shortbox.story 
            WHERE id IN (${Prisma.join(uniqueRootIds)})
            
            UNION ALL
            
            SELECT rd.root_id, s.id 
            FROM shortbox.story s
            INNER JOIN reprint_down rd ON s.fk_reprint = rd.id
          )
          SELECT root_id, id FROM reprint_down
        `;

        for (const row of descendants) {
          const root = Number(row.root_id);
          const desc = Number(row.id);
          allRelatedStoryIds.push(BigInt(desc));
          
          if (!rootToDescendants.has(root)) {
            rootToDescendants.set(root, new Set());
          }
          rootToDescendants.get(root)!.add(desc);
        }
      }

      // 3. Find all German children of any of these descendant story IDs
      const children = allRelatedStoryIds.length > 0
        ? await prisma.story.findMany({
            where: {
              fkParent: {
                in: allRelatedStoryIds,
              },
            },
            include: (issueDetailsStoryInclude as any).children.include,
          })
        : [];

      // Group children by target story ID
      for (const story of issue.stories) {
        const targetId = Number(story.id);
        const rootId = targetToRoot.get(targetId);
        if (rootId === undefined) {
          storyToChildren.set(targetId, story.children || []);
          continue;
        }
        const descendantSet = rootToDescendants.get(rootId);
        if (!descendantSet) {
          storyToChildren.set(targetId, story.children || []);
          continue;
        }

        // Filter children whose fkParent is in the descendantSet
        const targetChildren = children.filter((c: any) => descendantSet.has(Number(c.fkParent)));
        
        // Deduplicate children by ID
        const seenIds = new Set<string>();
        const uniqueTargetChildren = [];
        for (const child of targetChildren) {
          const cid = String(child.id);
          if (!seenIds.has(cid)) {
            seenIds.add(cid);
            uniqueTargetChildren.push(child);
          }
        }
        storyToChildren.set(targetId, uniqueTargetChildren);
      }
    } catch (e) {
      console.error("Failed to fetch reprint-aware children recursively, falling back to direct children", e);
      for (const story of issue.stories) {
        storyToChildren.set(Number(story.id), story.children || []);
      }
    }
  }

  return issue.stories.map((story: any) => 
    toIssueStoryShape(story, true, issueOverride, storyToChildren.get(Number(story.id)))
  );
}

function toIssueParentStoryShape(story: any) {
  if (!story) return null;

  return {
    id: serializeIssueId(story.id),
    number: serializeNullableIssueNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    collectedmultipletimes: story.collectedMultipleTimes,
    collected: story.collected,
    issue: toIssueReferenceShape(story.issue),
    reprintOf: story.reprint ? toIssueStoryReferenceShape(story.reprint) : null,
    reprints: sortStoryIssueReferencesByReleaseDate(story.reprintedBy).map(toIssueStoryReferenceShape),
    children: sortStoryIssueReferencesByReleaseDate(story.children).map(toIssueStoryReferenceShape),
    individuals: Array.isArray(story.individuals)
      ? story.individuals.map((entry: any) => ({
          id: serializeIssueId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
    appearances: Array.isArray(story.appearances)
      ? story.appearances.map((entry: any) => ({
          id: serializeIssueId(entry.appearance.id),
          name: entry.appearance.name || null,
          type: entry.appearance.type || "",
          role: entry.role || "",
        }))
      : [],
  };
}

function toIssueStoryReferenceShape(story: any) {
  return {
    id: serializeIssueId(story.id),
    number: serializeNullableIssueNumber(story.number),
    title: story.title || null,
    issue: toIssueReferenceShape(story.issue),
    parent: story.parent ? {
      issue: toIssueReferenceShape(story.parent.issue),
      number: serializeNullableIssueNumber(story.parent.number),
    } : null,
  };
}
