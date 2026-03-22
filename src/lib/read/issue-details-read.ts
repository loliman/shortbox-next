import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import {
  compareIssueVariants,
  normalizeIssueOptionalString,
  normalizeText,
  pickCanonicalIssueTitle,
  serializeIssueDate,
  serializeIssueId,
  serializeNullableIssueId,
  serializeNullableIssueNumber,
} from "./issue-read-shared";

export type IssueSelectionInput = {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
  number: string;
  format?: string | null;
  variant?: string | null;
};

const issueDetailsStoryInclude = Prisma.validator<Prisma.StoryInclude>()({
  issue: {
    include: {
      series: {
        include: {
          publisher: true,
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

export async function readIssueDetails(selection: IssueSelectionInput) {
  const current = await prisma.issue.findFirst({
    where: {
      number: selection.number,
      format: normalizeIssueOptionalString(selection.format) ?? undefined,
      variant: normalizeIssueOptionalString(selection.variant) ?? undefined,
      series: {
        title: selection.series,
        volume: BigInt(selection.volume),
        publisher: {
          name: selection.publisher,
          original: selection.us,
        },
      },
    },
    include: createIssueDetailsInclude(),
    orderBy: [{ id: "asc" }],
  });

  const fallback =
    current ||
    (await prisma.issue.findFirst({
      where: {
        number: selection.number,
        series: {
          title: selection.series,
          volume: BigInt(selection.volume),
          publisher: {
            name: selection.publisher,
            original: selection.us,
          },
        },
      },
      include: createIssueDetailsInclude(),
      orderBy: [{ format: "asc" }, { variant: "asc" }, { id: "asc" }],
    }));

  if (!fallback) return null;

  const variants = await prisma.issue.findMany({
    where: {
      number: fallback.number,
      fkSeries: fallback.fkSeries ?? undefined,
    },
    include: {
      stories: {
        select: {
          id: true,
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
    orderBy: [{ format: "asc" }, { variant: "asc" }, { id: "asc" }],
  });

  return toIssueDetailsShape(fallback, variants);
}

function toIssueDetailsShape(issue: any, variants: any[]) {
  const canonicalTitle = pickCanonicalIssueTitle([issue, ...variants], issue.title);
  const ownStories = Array.isArray(issue.stories) ? issue.stories : [];
  const sortedVariants = [...variants].sort(compareIssueVariants);
  const variantStoryOwner =
    ownStories.length > 0
      ? issue
      : sortedVariants.find((variant) => Array.isArray(variant.stories) && variant.stories.length > 0) ?? null;
  const storyOwner = variantStoryOwner
    ? {
        number: variantStoryOwner.number,
        legacy_number: variantStoryOwner.legacyNumber || null,
        format: variantStoryOwner.format || null,
        variant: variantStoryOwner.variant || null,
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
    stories: Array.isArray(variant.stories) ? variant.stories : [],
  }));

  return {
    id: serializeIssueId(issue.id),
    title: canonicalTitle || null,
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
    stories: issue.stories.map((story: any) => toIssueStoryShape(story, true)),
    cover: issue.covers[0] ? toIssueCoverShape(issue.covers[0]) : null,
    individuals: issue.individuals.map(toIssueIndividualEntryShape),
    arcs: issue.arcs.map((entry: any) => ({
      id: serializeIssueId(entry.arc.id),
      title: entry.arc.title || null,
      type: entry.arc.type || null,
    })),
    variants: mappedVariants,
    storyOwner,
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
    series: toIssueSeriesShape(issue.series),
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

function toIssueStoryShape(story: any, includeParent: boolean) {
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
    issue: toIssueReferenceShape(story.issue),
    parent: includeParent ? toIssueParentStoryShape(story.parent) : null,
    reprintOf: story.reprint ? toIssueStoryReferenceShape(story.reprint) : null,
    reprints: Array.isArray(story.reprintedBy) ? story.reprintedBy.map(toIssueStoryReferenceShape) : [],
    children: Array.isArray(story.children) ? story.children.map(toIssueStoryReferenceShape) : [],
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
    reprints: Array.isArray(story.reprintedBy) ? story.reprintedBy.map(toIssueStoryReferenceShape) : [],
    children: Array.isArray(story.children) ? story.children.map(toIssueStoryReferenceShape) : [],
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
  };
}
