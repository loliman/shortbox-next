/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import {
  compareIssueVariants,
  normalizeText,
  pickCanonicalIssueTitle,
  serializeIssueDate,
  serializeIssueId,
  serializeNullableIssueId,
  serializeNullableIssueNumber,
} from "./issue-read-shared";
import {
  matchesIssueSelectionBySlug,
  hasExplicitIssueVariantSelection,
  type IssueSelectionCandidate,
  type IssueSelectionInput,
} from "./issue-selection";

const issueDetailsStoryInclude = Prisma.validator<Prisma.StoryInclude>()({
  issue: {
    include: {
      series: {
        include: {
          publisher: true,
        },
      },
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
  reprint: {
    include: {
      issue: {
        include: {
          series: {
            include: {
              publisher: true,
            },
          },
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
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
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
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
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
      parent: {
        include: {
          issue: {
            include: {
              series: {
                include: {
                  publisher: true,
                },
              },
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

const issueArcStoryInclude = Prisma.validator<Prisma.StoryInclude>()({
  parent: {
    include: {
      issue: {
        include: {
          arcs: {
            include: {
              arc: true,
            },
          },
        },
      },
    },
  },
});

const issueSelectionCandidateSelect = Prisma.validator<Prisma.IssueSelect>()({
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

function createIssueDetailsInclude() {
  return Prisma.validator<Prisma.IssueInclude>()({
    series: {
      include: {
        publisher: true,
      },
    },
    stories: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: issueArcStoryInclude,
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

function createIssueStorySelectedIssueInclude() {
  return Prisma.validator<Prisma.IssueInclude>()({
    series: {
      include: {
        publisher: true,
      },
    },
    individuals: {
      include: {
        individual: true,
      },
    },
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

function pickCurrentIssueCandidate(
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

function getMatchingIssueCandidates(
  candidates: Array<IssueSelectionCandidate & { id: bigint }>,
  selection: IssueSelectionInput
) {
  return candidates.filter((candidate) =>
    matchesIssueSelectionBySlug(candidate as IssueSelectionCandidate, selection)
  );
}

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
        ...(normalizedStartYear ? { startYear: normalizedStartYear } : {}),
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
              ...(normalizedStartYear ? { startYear: normalizedStartYear } : {}),
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
  const currentCandidate = pickCurrentIssueCandidate(matchingCandidates, hasExplicitVariantSelection);

  const current = currentCandidate
    ? await prisma.issue.findUnique({
        where: {
          id: currentCandidate.id,
        },
        include: createIssueDetailsInclude(),
      })
    : null;

  if (!current) {
    if (process.env.NODE_ENV === "development") {
        console.warn("readIssueDetails miss", {
        selection,
        hasExplicitVariantSelection,
        candidateCount: resolvedCandidates.length,
        matchingCandidateCount: matchingCandidates.length,
        candidates: resolvedCandidates.slice(0, 10).map((candidate) => ({
          number: candidate.number,
          format: candidate.format,
          variant: candidate.variant,
          series: candidate.series?.title,
          volume: Number(candidate.series?.volume || 0),
          publisher: candidate.series?.publisher?.name,
          original: candidate.series?.publisher?.original,
        })),
      });
    }
    return null;
  }

  const variants = await prisma.issue.findMany({
    where: {
      number: current.number,
      fkSeries: current.fkSeries ?? undefined,
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
        include: {
          individuals: {
            include: {
              individual: true,
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
    orderBy: [{ format: "asc" }, { variant: "asc" }, { id: "asc" }],
  });

  return toIssueDetailsShape(current, variants);
}

function toIssueDetailsShape(issue: any, variants: any[]) {
  const ownStories = Array.isArray(issue.stories) ? issue.stories : [];
  const sortedVariants = [...variants].sort(compareIssueVariants);
  const ownStoryCount = Number(issue?._count?.stories || 0);
  const storySourceIssue =
    ownStoryCount > 0
      ? issue
      : sortedVariants.find((variant) => Number(variant?._count?.stories || 0) > 0) ?? null;
  const resolvedTitle =
    pickCanonicalIssueTitle([issue, ...variants], issue.title) ||
    storySourceIssue?.title ||
    issue.title ||
    null;
  const storyOwner = storySourceIssue
    ? {
        number: storySourceIssue.number,
        legacy_number: storySourceIssue.legacyNumber || null,
        format: storySourceIssue.format || null,
        variant: storySourceIssue.variant || null,
      }
    : null;
  const isOwnStoryOwner = storyOwner
    ? normalizeText(issue.number) === normalizeText(storyOwner.number) &&
      normalizeText(issue.legacyNumber) === normalizeText(storyOwner.legacy_number) &&
      normalizeText(issue.format) === normalizeText(storyOwner.format) &&
      normalizeText(issue.variant) === normalizeText(storyOwner.variant)
    : false;
  const inheritsStories = Boolean(storyOwner) && !isOwnStoryOwner;

  const mappedVariants = variants.map((variant) => ({
    id: serializeIssueId(variant.id),
    title: variant.title || null,
    number: variant.number,
    legacy_number: variant.legacyNumber || null,
    format: variant.format || null,
    variant: variant.variant || null,
    releasedate: serializeIssueDate(variant.releaseDate),
    verified: variant.verified,
    collected: variant.collected ?? null,
    comicguideid: serializeNullableIssueId(variant.comicGuideId),
    cover: variant.covers[0] ? toIssueCoverShape(variant.covers[0]) : null,
    series: toIssueSeriesShape(variant.series),
  }));

  return {
    id: serializeIssueId(issue.id),
    title: resolvedTitle,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    format: issue.format || null,
    variant: issue.variant || null,
    releasedate: serializeIssueDate(issue.releaseDate),
    pages: serializeNullableIssueNumber(issue.pages),
    price: issue.price ?? null,
    currency: issue.currency || null,
    isbn: issue.isbn || null,
    limitation: issue.limitation === null || issue.limitation === undefined ? null : String(issue.limitation),
    addinfo: issue.addInfo || null,
    verified: issue.verified,
    collected: issue.collected ?? null,
    comicguideid: serializeNullableIssueId(issue.comicGuideId),
    createdat: serializeIssueDate(issue.createdAt),
    updatedat: serializeIssueDate(issue.updatedAt),
    series: toIssueSeriesShape(issue.series),
    stories: ownStories.map((story: any) => ({
      parent: story.parent?.issue
        ? {
            issue: {
              arcs: Array.isArray(story.parent.issue.arcs)
                ? story.parent.issue.arcs.map((entry: any) => ({
                    id: serializeIssueId(entry.arc.id),
                    title: entry.arc.title || null,
                    type: entry.arc.type || null,
                  }))
                : [],
            },
          }
        : null,
    })),
    cover: issue.covers[0] ? toIssueCoverShape(issue.covers[0]) : null,
    individuals: issue.individuals.map(toIssueIndividualEntryShape),
    arcs: issue.arcs.map((entry: any) => ({
      id: serializeIssueId(entry.arc.id),
      title: entry.arc.title || null,
      type: entry.arc.type || null,
    })),
    variants: mappedVariants,
    storyOwner,
    storyOwnerId: storySourceIssue ? serializeIssueId(storySourceIssue.id) : null,
    inheritsStories,
    tags: [],
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

  return {
    id: serializeIssueId(issue.id),
    title: issue.title || null,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    format: issue.format || null,
    variant: issue.variant || null,
    releasedate: serializeIssueDate(issue.releaseDate),
    collected: issue.collected ?? null,
    comicguideid: serializeNullableIssueNumber(issue.comicGuideId),
    cover: issue.covers?.[0] ? toIssueCoverShape(issue.covers[0]) : null,
    series: toIssueSeriesShape(issue.series),
    individuals: Array.isArray(issue.individuals)
      ? issue.individuals.map(toIssueIndividualEntryShape)
      : [],
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
  const releaseDateCompare =
    toReleaseDateTimestamp(left?.issue?.releaseDate) - toReleaseDateTimestamp(right?.issue?.releaseDate);
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

function toIssueStoryShape(story: any, includeParent: boolean, issueOverride?: any) {
  return {
    id: serializeIssueId(story.id),
    number: serializeNullableIssueNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    exclusive: !story.parent,
    onlyapp: story.onlyApp,
    firstapp: story.firstApp,
    onlytb: story.onlyTb,
    otheronlytb: story.otherOnlyTb,
    onlyoneprint: story.onlyOnePrint,
    collected: story.collected,
    collectedmultipletimes: story.collectedMultipleTimes,
    issue: toIssueReferenceShape(issueOverride || story.issue),
    parent: includeParent ? toIssueParentStoryShape(story.parent) : null,
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

export async function readIssueDetailStories(input: {
  selectedIssueId: string | number;
  storyOwnerId?: string | number | null;
}) {
  const selectedIssueId = BigInt(String(input.selectedIssueId));
  const storyOwnerId =
    input.storyOwnerId === null || input.storyOwnerId === undefined
      ? null
      : BigInt(String(input.storyOwnerId));

  if (!storyOwnerId) return [];

  const storyOwnerIssuePromise = prisma.issue.findUnique({
    where: {
      id: storyOwnerId,
    },
    include: createIssueStoryOwnerInclude(),
  });
  const selectedIssuePromise =
    selectedIssueId === storyOwnerId
      ? Promise.resolve(null)
      : prisma.issue.findUnique({
          where: {
            id: selectedIssueId,
          },
          include: createIssueStorySelectedIssueInclude(),
        });

  const [selectedIssue, storyOwnerIssue] = await Promise.all([
    selectedIssuePromise,
    storyOwnerIssuePromise,
  ]);

  if (!storyOwnerIssue || !Array.isArray(storyOwnerIssue.stories)) return [];

  const issueOverride = selectedIssue ?? storyOwnerIssue;
  return storyOwnerIssue.stories.map((story: any) => toIssueStoryShape(story, true, issueOverride));
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
    addinfo: story.addInfo || null,
    part: story.part || null,
    issue: toIssueReferenceShape(story.issue),
    parent: story.parent
      ? {
          issue: toIssueReferenceShape(story.parent.issue),
          number: serializeNullableIssueNumber(story.parent.number),
        }
      : null,
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
