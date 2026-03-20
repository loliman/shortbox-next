import { prisma } from "../prisma/client";

type IssueSelectionInput = {
  us: boolean;
  publisher: string;
  series: string;
  volume: number;
  number: string;
  format?: string | null;
  variant?: string | null;
};

export async function getIssueScreenData(selection: IssueSelectionInput) {
  try {
    const current = await prisma.issue.findFirst({
      where: {
        number: selection.number,
        format: normalizeOptionalString(selection.format) ?? undefined,
        variant: normalizeOptionalString(selection.variant) ?? undefined,
        series: {
          title: selection.series,
          volume: selection.volume,
          publisher: {
            name: selection.publisher,
            original: selection.us,
          },
        },
      },
      include: createIssueInclude(),
      orderBy: [{ id: "asc" }],
    });

    const fallback =
      current ||
      (await prisma.issue.findFirst({
        where: {
          number: selection.number,
          series: {
            title: selection.series,
            volume: selection.volume,
            publisher: {
              name: selection.publisher,
              original: selection.us,
            },
          },
        },
        include: createIssueInclude(),
        orderBy: [{ format: "asc" }, { variant: "asc" }, { id: "asc" }],
      }));

    if (!fallback) return null;

    const variants = await prisma.issue.findMany({
      where: {
        number: fallback.number,
        fkSeries: fallback.fkSeries ?? undefined,
      },
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
      orderBy: [{ format: "asc" }, { variant: "asc" }, { id: "asc" }],
    });

    return toIssueDetailsShape(fallback, variants);
  } catch {
    return null;
  }
}

const storyInclude = {
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
      children: {
        orderBy: [{ number: "asc" }, { id: "asc" }],
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
    orderBy: [{ number: "asc" }, { id: "asc" }],
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
} as const;

function createIssueInclude() {
  return {
    series: {
      include: {
        publisher: true,
      },
    },
    stories: {
      orderBy: [{ number: "asc" }, { id: "asc" }],
      include: storyInclude,
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
  } as const;
}

function toIssueDetailsShape(issue: any, variants: any[]) {
  const mappedVariants = variants.map((variant) => ({
    id: serializeId(variant.id),
    title: variant.title || null,
    number: variant.number,
    legacy_number: variant.legacyNumber || null,
    format: variant.format || null,
    variant: variant.variant || null,
    releasedate: serializeDate(variant.releaseDate),
    verified: variant.verified,
    collected: variant.collected ?? null,
    comicguideid: serializeNullableId(variant.comicGuideId),
    cover: variant.covers[0] ? toCoverShape(variant.covers[0]) : null,
  }));

  return {
    id: serializeId(issue.id),
    title: issue.title || null,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    format: issue.format || null,
    variant: issue.variant || null,
    releasedate: serializeDate(issue.releaseDate),
    pages: serializeNullableNumber(issue.pages),
    price: issue.price ?? null,
    currency: issue.currency || null,
    isbn: issue.isbn || null,
    limitation: issue.limitation === null || issue.limitation === undefined ? null : String(issue.limitation),
    addinfo: issue.addInfo || null,
    verified: issue.verified,
    collected: issue.collected ?? null,
    comicguideid: serializeNullableId(issue.comicGuideId),
    createdat: serializeDate(issue.createdAt),
    updatedat: serializeDate(issue.updatedAt),
    series: toSeriesShape(issue.series),
    stories: issue.stories.map((story: any) => toStoryShape(story, true)),
    cover: issue.covers[0] ? toCoverShape(issue.covers[0]) : null,
    individuals: issue.individuals.map(toIssueIndividualShape),
    arcs: issue.arcs.map((entry: any) => ({
      id: serializeId(entry.arc.id),
      title: entry.arc.title || null,
      type: entry.arc.type || null,
    })),
    variants: mappedVariants,
    storyOwner: null,
    inheritsStories: false,
    tags: [],
  };
}

function toSeriesShape(series: any) {
  if (!series) return null;

  return {
    id: serializeId(series.id),
    title: series.title || null,
    startyear: serializeNullableNumber(series.startYear),
    endyear: serializeNullableNumber(series.endYear),
    volume: serializeNullableNumber(series.volume),
    genre: series.genre || null,
    addinfo: series.addInfo || null,
    publisher: series.publisher
      ? {
          id: serializeId(series.publisher.id),
          name: series.publisher.name || null,
          us: series.publisher.original,
          addinfo: series.publisher.addInfo || null,
          startyear: serializeNullableNumber(series.publisher.startYear),
          endyear: serializeNullableNumber(series.publisher.endYear),
        }
      : null,
  };
}

function toIssueReference(issue: any) {
  if (!issue) return null;

  return {
    id: serializeId(issue.id),
    title: issue.title || null,
    number: issue.number,
    legacy_number: issue.legacyNumber || null,
    format: issue.format || null,
    variant: issue.variant || null,
    releasedate: serializeDate(issue.releaseDate),
    collected: issue.collected ?? null,
    series: toSeriesShape(issue.series),
  };
}

function toCoverShape(cover: any) {
  return {
    id: serializeId(cover.id),
    url: cover.url || null,
    number: serializeNullableNumber(cover.number),
    addinfo: cover.addInfo || null,
    individuals: Array.isArray(cover.individuals)
      ? cover.individuals.map((entry: any) => ({
          id: serializeId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
  };
}

function toIssueIndividualShape(entry: any) {
  return {
    id: serializeId(entry.individual.id),
    name: entry.individual.name || null,
    type: entry.type || "",
  };
}

function toStoryShape(story: any, includeParent: boolean) {
  return {
    id: serializeId(story.id),
    number: serializeNullableNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    exclusive: false,
    onlyapp: story.onlyApp,
    firstapp: story.firstApp,
    onlytb: story.onlyTb,
    otheronlytb: story.otherOnlyTb,
    onlyoneprint: story.onlyOnePrint,
    collected: story.collected,
    collectedmultipletimes: story.collectedMultipleTimes,
    issue: toIssueReference(story.issue),
    parent: includeParent ? toParentStoryShape(story.parent) : null,
    reprintOf: story.reprint ? toStoryReference(story.reprint) : null,
    reprints: Array.isArray(story.reprintedBy) ? story.reprintedBy.map(toStoryReference) : [],
    children: Array.isArray(story.children) ? story.children.map(toStoryReference) : [],
    individuals: Array.isArray(story.individuals)
      ? story.individuals.map((entry: any) => ({
          id: serializeId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
    appearances: Array.isArray(story.appearances)
      ? story.appearances.map((entry: any) => ({
          id: serializeId(entry.appearance.id),
          name: entry.appearance.name || null,
          type: entry.appearance.type || "",
          role: entry.role || "",
        }))
      : [],
  };
}

function toParentStoryShape(story: any) {
  if (!story) return null;

  return {
    id: serializeId(story.id),
    number: serializeNullableNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    collectedmultipletimes: story.collectedMultipleTimes,
    issue: toIssueReference(story.issue),
    reprintOf: story.reprint ? toStoryReference(story.reprint) : null,
    reprints: Array.isArray(story.reprintedBy) ? story.reprintedBy.map(toStoryReference) : [],
    children: Array.isArray(story.children) ? story.children.map(toStoryReference) : [],
    individuals: Array.isArray(story.individuals)
      ? story.individuals.map((entry: any) => ({
          id: serializeId(entry.individual.id),
          name: entry.individual.name || null,
          type: entry.type || "",
        }))
      : [],
    appearances: Array.isArray(story.appearances)
      ? story.appearances.map((entry: any) => ({
          id: serializeId(entry.appearance.id),
          name: entry.appearance.name || null,
          type: entry.appearance.type || "",
          role: entry.role || "",
        }))
      : [],
  };
}

function toStoryReference(story: any) {
  return {
    id: serializeId(story.id),
    number: serializeNullableNumber(story.number),
    title: story.title || null,
    addinfo: story.addInfo || null,
    part: story.part || null,
    issue: toIssueReference(story.issue),
    parent: story.parent
      ? {
          issue: toIssueReference(story.parent.issue),
          number: serializeNullableNumber(story.parent.number),
        }
      : null,
  };
}

function normalizeOptionalString(value: string | null | undefined) {
  const normalized = String(value || "").trim();
  return normalized === "" ? null : normalized;
}

function serializeDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function serializeId(value: bigint | number | string) {
  return String(value);
}

function serializeNullableId(value: bigint | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function serializeNullableNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}
