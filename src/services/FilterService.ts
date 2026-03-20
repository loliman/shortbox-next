import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma/client";
import type { Filter, NumberFilter } from "../types/query-data";
import { generateLabel } from "../util/hierarchy";

const MULTI_FILTER_SEPARATOR_REGEX = /\s*\|\|\s*/g;
const TRANSLATOR_STORY_INDIVIDUAL_TYPE = "TRANSLATOR";

type RuntimeFilter = Filter & {
  noComicguideId?: boolean;
  noContent?: boolean;
  firstPrint?: boolean;
  notFirstPrint?: boolean;
  onlyPrint?: boolean;
  notOnlyPrint?: boolean;
  onlyTb?: boolean;
  notOnlyTb?: boolean;
  exclusive?: boolean;
  notExclusive?: boolean;
  reprint?: boolean;
  notReprint?: boolean;
  otherOnlyTb?: boolean;
  notOtherOnlyTb?: boolean;
  noPrint?: boolean;
  notNoPrint?: boolean;
  onlyOnePrint?: boolean;
  notOnlyOnePrint?: boolean;
  onlyCollected?: boolean;
  onlyNotCollected?: boolean;
  onlyNotCollectedNoOwnedVariants?: boolean;
  individuals?: Array<{ name?: string | null; type?: Array<string | null> | string | null } | null>;
  appearances?: Array<{ name?: string | null } | null> | string | null;
  realities?: Array<{ name?: string | null } | null> | string | null;
  arcs?: Array<{ title?: string | null } | null> | string | null;
  numbers?: Array<(NumberFilter & { variant?: string | null }) | null>;
};

const filterIssueInclude = {
  series: {
    include: {
      publisher: true,
    },
  },
  covers: {
    orderBy: [{ number: "asc" }, { id: "asc" }],
    select: {
      id: true,
      url: true,
      number: true,
    },
  },
  arcs: {
    include: {
      arc: true,
    },
  },
  stories: {
    include: {
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
      appearances: {
        include: {
          appearance: true,
        },
      },
      individuals: {
        include: {
          individual: true,
        },
      },
      parent: {
        include: {
          children: {
            select: {
              id: true,
            },
          },
          issue: {
            include: {
              arcs: {
                include: {
                  arc: true,
                },
              },
            },
          },
          appearances: {
            include: {
              appearance: true,
            },
          },
          individuals: {
            include: {
              individual: true,
            },
          },
        },
      },
      children: {
        include: {
          issue: {
            select: {
              collected: true,
            },
          },
          appearances: {
            include: {
              appearance: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.IssueInclude;

type FilterIssueRecord = Prisma.IssueGetPayload<{
  include: typeof filterIssueInclude;
}>;

type ExportPublisher = { name: string };
type ExportSeries = {
  title: string;
  volume: number;
  startyear: number;
  endyear: number;
  publisher: ExportPublisher;
};
type ExportIssueData = {
  number: string;
  format: string;
  variant: string;
  pages: number;
  releasedate: string;
  price: number;
  currency: string;
  series: ExportSeries;
};
type ExportResponse = Record<string, Record<string, ExportIssueData[]>>;
type SortedExportResponse = Array<[string, Array<[string, ExportIssueData[]]>]>;

function dedupeTerms(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter((value, index, allValues) => value.length > 0 && allValues.indexOf(value) === index);
}

function splitFilterTerms(value: string | null | undefined): string[] {
  if (!value) return [];
  return dedupeTerms(value.split(MULTI_FILTER_SEPARATOR_REGEX));
}

function containsInsensitive(haystack: string | null | undefined, needle: string): boolean {
  return String(haystack || "").toLocaleLowerCase("de-DE").includes(needle.toLocaleLowerCase("de-DE"));
}

function alphaCompare(a: string, b: string): number {
  return a.localeCompare(b, "de-DE", { sensitivity: "base" });
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, "de-DE", { numeric: true, sensitivity: "base" });
}

function isNumericFilterValue(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

function parseFilterDate(raw: string | null | undefined): Date | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDayKey(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function compareValues(left: string, right: string, compare: string): boolean {
  switch (compare) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    default:
      return left === right;
  }
}

function compareNumericValues(left: number, right: number, compare: string): boolean {
  switch (compare) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    default:
      return left === right;
  }
}

function formatRank(format: string | null | undefined): number {
  switch (String(format || "").trim().toLocaleLowerCase("de-DE")) {
    case "heft":
      return 1;
    case "softcover":
      return 2;
    case "taschenbuch":
      return 3;
    case "hardcover":
      return 4;
    default:
      return 5;
  }
}

function getStoryAppearanceNames(issue: FilterIssueRecord, us: boolean): string[] {
  const values = new Set<string>();
  for (const story of issue.stories) {
    for (const link of story.appearances) values.add(link.appearance.name);
    for (const child of story.children) {
      for (const link of child.appearances) values.add(link.appearance.name);
    }
    if (!us && story.parent) {
      for (const link of story.parent.appearances) values.add(link.appearance.name);
    }
  }
  return [...values];
}

function getArcTitles(issue: FilterIssueRecord, us: boolean): string[] {
  const values = new Set<string>();
  if (us) {
    for (const link of issue.arcs) values.add(link.arc.title);
    return [...values];
  }

  for (const story of issue.stories) {
    if (!story.parent?.issue) continue;
    for (const link of story.parent.issue.arcs) values.add(link.arc.title);
  }
  return [...values];
}

function matchesReleasedates(issue: FilterIssueRecord, releasedates: RuntimeFilter["releasedates"]): boolean {
  if (!releasedates || releasedates.length === 0) return true;
  const issueDay = toDayKey(issue.releaseDate);
  if (!issueDay) return false;

  return releasedates.every((entry) => {
    const filterDate = parseFilterDate(entry?.date);
    const filterDay = toDayKey(filterDate);
    if (!filterDay) return true;
    return compareValues(issueDay, filterDay, String(entry?.compare || "="));
  });
}

function matchesNumbers(issue: FilterIssueRecord, numbers: RuntimeFilter["numbers"]): boolean {
  if (!numbers || numbers.length === 0) return true;

  return numbers.every((entry) => {
    const rawNumber = String(entry?.number || "").trim();
    if (!rawNumber) return true;

    const compare = String(entry?.compare || "=");
    const variant =
      entry && typeof entry === "object" && "variant" in entry
        ? String(entry.variant || "").trim()
        : "";
    const hasVariant = variant.length > 0;

    const candidates = [issue.number, issue.legacyNumber || ""].filter((value) => value.trim().length > 0);
    const numeric = isNumericFilterValue(rawNumber);
    const matched = candidates.some((candidate) => {
      if (numeric && isNumericFilterValue(candidate)) {
        return compareNumericValues(Number(candidate), Number(rawNumber), compare);
      }
      return compareValues(candidate, rawNumber, compare);
    });

    if (!matched) return false;
    if (hasVariant && String(issue.variant || "") !== variant) return false;
    return true;
  });
}

function matchesIndividuals(issue: FilterIssueRecord, individuals: RuntimeFilter["individuals"]): boolean {
  if (!individuals || individuals.length === 0) return true;

  return individuals.every((entry) => {
    const name = String(entry?.name || "").trim();
    if (!name) return true;

    const rawTypes = Array.isArray(entry?.type) ? entry.type : entry?.type ? [entry.type] : [];
    const normalizedTypes = dedupeTerms(
      rawTypes
        .filter((type): type is string => typeof type === "string")
        .map((type) => type.trim().toUpperCase())
        .filter((type) => type.length > 0)
    );
    const nonTranslatorTypes = normalizedTypes.filter((type) => type !== TRANSLATOR_STORY_INDIVIDUAL_TYPE);
    const includesTranslator = normalizedTypes.includes(TRANSLATOR_STORY_INDIVIDUAL_TYPE);

    return issue.stories.some((story) => {
      const storyIndividuals = story.individuals;
      const parentIndividuals = story.parent?.individuals || [];

      const matchesStory = (types: string[]) =>
        storyIndividuals.some(
          (link) =>
            link.individual.name === name &&
            (types.length === 0 || types.includes(String(link.type || "").toUpperCase()))
        );

      const matchesParent = (types: string[]) =>
        parentIndividuals.some(
          (link) =>
            link.individual.name === name &&
            (types.length === 0 || types.includes(String(link.type || "").toUpperCase()))
        );

      if (normalizedTypes.length === 0) return matchesStory([]) || matchesParent([]);
      if (includesTranslator && matchesStory([TRANSLATOR_STORY_INDIVIDUAL_TYPE])) return true;

      if (nonTranslatorTypes.length === 0) return false;
      if (matchesParent(nonTranslatorTypes)) return true;
      if (!story.parent && matchesStory(nonTranslatorTypes)) return true;
      return false;
    });
  });
}

function matchesStorySwitches(issue: FilterIssueRecord, filter: RuntimeFilter): boolean {
  if (!issue.stories.length) {
    if (filter.reprint) return false;
    if (filter.notReprint) return true;
    if (filter.noPrint) return true;
    if (filter.notNoPrint) return false;
  }

  const storyConditions: boolean[] = [];
  if (filter.firstPrint) storyConditions.push(issue.stories.some((story) => story.firstApp));
  if (filter.notFirstPrint) storyConditions.push(issue.stories.some((story) => !story.firstApp));
  if (filter.onlyPrint) storyConditions.push(issue.stories.some((story) => story.onlyApp));
  if (filter.notOnlyPrint) storyConditions.push(issue.stories.some((story) => !story.onlyApp));
  if (filter.onlyTb) storyConditions.push(issue.stories.some((story) => story.onlyTb));
  if (filter.notOnlyTb) storyConditions.push(issue.stories.some((story) => !story.onlyTb));
  if (filter.exclusive) storyConditions.push(issue.stories.some((story) => !story.parent));
  if (filter.notExclusive) storyConditions.push(issue.stories.some((story) => Boolean(story.parent)));
  if (filter.reprint) storyConditions.push(issue.stories.length > 0 && issue.stories.every((story) => !story.firstApp));
  if (filter.notReprint)
    storyConditions.push(issue.stories.length === 0 || issue.stories.some((story) => story.firstApp));
  if (filter.otherOnlyTb) storyConditions.push(issue.stories.some((story) => story.otherOnlyTb));
  if (filter.notOtherOnlyTb) storyConditions.push(issue.stories.some((story) => !story.otherOnlyTb));
  if (filter.noPrint)
    storyConditions.push(issue.stories.length === 0 || issue.stories.some((story) => !story.firstApp && !story.onlyApp));
  if (filter.notNoPrint)
    storyConditions.push(issue.stories.some((story) => story.firstApp || story.onlyApp));
  if (filter.onlyOnePrint) storyConditions.push(issue.stories.some((story) => story.onlyOnePrint));
  if (filter.notOnlyOnePrint) storyConditions.push(issue.stories.some((story) => !story.onlyOnePrint));

  return storyConditions.every(Boolean);
}

function reduceOwnedVariantGroups(issues: FilterIssueRecord[]): FilterIssueRecord[] {
  const groups = new Map<string, FilterIssueRecord[]>();
  for (const issue of issues) {
    const key = `${issue.fkSeries ?? "x"}::${issue.number}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(issue);
    else groups.set(key, [issue]);
  }

  const reduced: FilterIssueRecord[] = [];
  for (const group of groups.values()) {
    if (group.some((issue) => issue.collected === true)) continue;
    const preferred = [...group].sort((left, right) => {
      const formatCompare = formatRank(left.format) - formatRank(right.format);
      if (formatCompare !== 0) return formatCompare;
      return Number(left.id) - Number(right.id);
    })[0];
    if (preferred) reduced.push(preferred);
  }
  return reduced;
}

export class FilterService {
  private requestId?: string;

  constructor(requestId?: string) {
    this.requestId = requestId;
    void this.requestId;
  }

  public async export(filter: Filter, type: string, loggedIn: boolean) {
    if (type !== "txt" && type !== "csv") {
      throw new Error("Gültige Export Typen: txt, csv");
    }

    const issues = await this.getFilteredIssues(filter, loggedIn);
    const response: ExportResponse = {};

    for (const issue of issues) {
      const publisherName = issue.series?.publisher?.name || "Unbekannter Verlag";
      const publisher: ExportPublisher = { name: publisherName };
      const series: ExportSeries = {
        title: issue.series?.title || "",
        volume: Number(issue.series?.volume || 0),
        startyear: Number(issue.series?.startYear || 0),
        endyear: Number(issue.series?.endYear || 0),
        publisher,
      };
      const issueData: ExportIssueData = {
        number: issue.number,
        format: issue.format || "",
        variant: issue.variant || "",
        pages: Number(issue.pages || 0),
        releasedate: toDayKey(issue.releaseDate) || "",
        price: Number(issue.price || 0),
        currency: issue.currency || "",
        series,
      };

      const publisherLabel = publisher.name;
      const seriesLabel = generateLabel({
        series: {
          title: series.title,
          volume: series.volume,
          startyear: series.startyear,
          endyear: series.endyear,
          publisher: {
            name: publisher.name,
            us: null,
          },
        },
      } as never);

      if (!response[publisherLabel]) response[publisherLabel] = {};
      if (!response[publisherLabel][seriesLabel]) response[publisherLabel][seriesLabel] = [];
      response[publisherLabel][seriesLabel].push(issueData);
    }

    const sortedResponse: SortedExportResponse = Object.keys(response)
      .map((publisherLabel) => [
        publisherLabel,
        Object.keys(response[publisherLabel] || {})
          .map((seriesLabel) => [
            seriesLabel,
            [...(response[publisherLabel]?.[seriesLabel] || [])].sort((left, right) =>
              naturalCompare(left.number, right.number)
            ),
          ] as [string, ExportIssueData[]])
          .sort((left, right) => alphaCompare(left[0], right[0])),
      ] as [string, Array<[string, ExportIssueData[]]>])
      .sort((left, right) => alphaCompare(left[0], right[0]));

    if (type === "txt") {
      return (
        "Anzahl Ergebnisse: " +
        issues.length +
        "\n\n" +
        (await this.convertFilterToTxt(filter, loggedIn)) +
        (await this.resultsToTxt(sortedResponse))
      );
    }

    return this.resultsToCsv(sortedResponse);
  }

  public async count(filter: Filter, loggedIn: boolean): Promise<number> {
    const issues = await this.getFilteredIssues(filter, loggedIn);
    return issues.length;
  }

  private async getFilteredIssues(filter: Filter, loggedIn: boolean): Promise<FilterIssueRecord[]> {
    void loggedIn;
    const runtimeFilter = filter as RuntimeFilter;
    const where = this.buildBaseWhere(runtimeFilter);

    const issues = await prisma.issue.findMany({
      where,
      include: filterIssueInclude,
    });

    const filtered = issues.filter((issue) => this.matchesIssue(issue, runtimeFilter));
    if (runtimeFilter.onlyNotCollectedNoOwnedVariants) {
      return reduceOwnedVariantGroups(filtered);
    }
    return filtered;
  }

  private buildBaseWhere(filter: RuntimeFilter): Prisma.IssueWhereInput {
    const and: Prisma.IssueWhereInput[] = [
      {
        series: {
          publisher: {
            original: Boolean(filter.us),
          },
        },
      },
    ];

    const formats = (filter.formats || [])
      .map((format) => String(format || "").trim())
      .filter((format) => format.length > 0);
    if (formats.length > 0) and.push({ format: { in: formats } });

    if (filter.withVariants && !filter.onlyCollected) {
      and.push({
        NOT: {
          OR: [{ variant: null }, { variant: "" }],
        },
      });
    }

    if (filter.onlyCollected) and.push({ collected: true });
    if (filter.onlyNotCollected || filter.onlyNotCollectedNoOwnedVariants) and.push({ collected: false });

    const publisherNames = (filter.publishers || [])
      .map((publisher) => String(publisher?.name || "").trim())
      .filter((name) => name.length > 0);
    if (publisherNames.length > 0) {
      and.push({
        series: {
          publisher: {
            name: {
              in: publisherNames,
            },
          },
        },
      });
    }

    const seriesConditions = (filter.series || [])
      .map((series) => {
        const title = String(series?.title || "").trim();
        const volume = typeof series?.volume === "number" ? series.volume : null;
        if (!title || volume === null) return null;
        return {
          title,
          volume: BigInt(volume),
        };
      })
      .filter((entry): entry is { title: string; volume: bigint } => Boolean(entry));
    if (seriesConditions.length > 0) {
      and.push({
        OR: seriesConditions.map((series) => ({
          series: {
            title: series.title,
            volume: series.volume,
          },
        })),
      });
    }

    if (filter.noComicguideId) {
      and.push({
        OR: [{ comicGuideId: null }, { comicGuideId: BigInt(0) }],
      });
    }

    if (filter.noContent) {
      and.push({
        stories: {
          none: {},
        },
      });
    }

    return and.length === 1 ? and[0] : { AND: and };
  }

  private matchesIssue(issue: FilterIssueRecord, filter: RuntimeFilter): boolean {
    if (!matchesReleasedates(issue, filter.releasedates)) return false;
    if (!matchesNumbers(issue, filter.numbers)) return false;
    if (!matchesIndividuals(issue, filter.individuals)) return false;
    if (!matchesStorySwitches(issue, filter)) return false;

    const arcTerms = Array.isArray(filter.arcs)
      ? dedupeTerms(
          filter.arcs
            .map((arc) => String(arc?.title || "").trim())
            .filter((arc) => arc.length > 0)
        )
      : splitFilterTerms(filter.arcs as string | null | undefined);
    if (arcTerms.length > 0) {
      const arcTitles = getArcTitles(issue, Boolean(filter.us));
      const matchesArcs = arcTerms.every((term) =>
        arcTitles.some((title) => containsInsensitive(title, term))
      );
      if (!matchesArcs) return false;
    }

    const appearanceTerms = Array.isArray(filter.appearances)
      ? dedupeTerms(
          filter.appearances
            .map((appearance) => String(appearance?.name || "").trim())
            .filter((appearance) => appearance.length > 0)
        )
      : splitFilterTerms(filter.appearances as string | null | undefined);
    const realityTerms = Array.isArray(filter.realities)
      ? dedupeTerms(
          filter.realities
            .map((reality) => String(reality?.name || "").trim())
            .filter((reality) => reality.length > 0)
        )
      : splitFilterTerms(filter.realities as string | null | undefined);
    if (appearanceTerms.length > 0 || realityTerms.length > 0) {
      const appearanceNames = getStoryAppearanceNames(issue, Boolean(filter.us));
      if (
        appearanceTerms.some(
          (term) => !appearanceNames.some((appearanceName) => containsInsensitive(appearanceName, term))
        )
      ) {
        return false;
      }
      if (
        realityTerms.some((term) => {
          const marker = `(${term})`;
          return !appearanceNames.some((appearanceName) => containsInsensitive(appearanceName, marker));
        })
      ) {
        return false;
      }
    }

    return true;
  }

  private async resultsToCsv(results: SortedExportResponse) {
    let responseString =
      "Verlag;Series;Volume;Start;Ende;Nummer;Variante;Format;Seiten;Erscheinungsdaten;Preis;Währung\n";

    results.forEach((publisherEntry) => {
      publisherEntry[1].forEach((seriesEntry) => {
        seriesEntry[1].forEach((issueEntry) => {
          responseString +=
            issueEntry.series.publisher.name +
            "\t;" +
            issueEntry.series.title +
            "\t;" +
            issueEntry.series.volume +
            "\t;" +
            issueEntry.series.startyear +
            "\t;" +
            issueEntry.series.endyear +
            "\t;" +
            issueEntry.number +
            "\t;" +
            issueEntry.variant +
            "\t;" +
            issueEntry.format +
            "\t;" +
            issueEntry.pages +
            "\t;" +
            issueEntry.releasedate +
            "\t;" +
            String(issueEntry.price).replace(".", ",") +
            "\t;" +
            issueEntry.currency +
            "\n";
        });
      });
    });

    return responseString;
  }

  private async resultsToTxt(results: SortedExportResponse) {
    let responseString = "";

    results.forEach((publisherEntry) => {
      responseString += publisherEntry[0] + "\n";
      publisherEntry[1].forEach((seriesEntry) => {
        responseString += "\t" + seriesEntry[0] + "\n";
        seriesEntry[1].forEach((issueEntry) => {
          responseString += "\t\t#" + issueEntry.number + "\n";
        });
      });
      responseString += "\n";
    });

    return responseString;
  }

  private async convertFilterToTxt(filter: Filter, loggedIn: boolean) {
    void loggedIn;
    const runtimeFilter = filter as RuntimeFilter;
    let s = "Aktive Filter\n";
    s += "\t" + (runtimeFilter.us ? "Original Ausgaben" : "Deutsche Ausgaben") + "\n";
    s += "\tDetails\n";

    if (runtimeFilter.formats) {
      s += "\t\tFormat: ";
      runtimeFilter.formats.forEach((format) => (s += String(format || "") + ", "));
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (runtimeFilter.withVariants) s += "\t\tmit Varianten\n";

    if (runtimeFilter.releasedates) {
      s += "\t\tErscheinungsdatum: ";
      runtimeFilter.releasedates.forEach((releasedate) => {
        if (releasedate?.date) s += String(releasedate.date) + " " + String(releasedate.compare || "=") + ", ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (!runtimeFilter.formats && !runtimeFilter.withVariants && !runtimeFilter.releasedates) s += "\t\t-\n";
    if (runtimeFilter.noComicguideId) s += "\tOhne Comicguide ID\n";
    if (runtimeFilter.noContent) s += "\tOhne Inhalt\n";

    s += "\tEnthält\n";
    if (runtimeFilter.firstPrint) s += "\t\tErstausgabe\n";
    if (runtimeFilter.notFirstPrint) s += "\t\tNicht Erstausgabe\n";
    if (runtimeFilter.onlyPrint) s += "\t\tEinzige Ausgabe\n";
    if (runtimeFilter.notOnlyPrint) s += "\t\tNicht einzige Ausgabe\n";
    if (runtimeFilter.onlyTb) s += "\t\tNur in TB\n";
    if (runtimeFilter.notOnlyTb) s += "\t\tNicht nur in TB\n";
    if (runtimeFilter.exclusive) s += "\t\tExclusiv\n";
    if (runtimeFilter.notExclusive) s += "\t\tNicht exklusiv\n";
    if (runtimeFilter.reprint) s += "\t\tReiner Nachdruck\n";
    if (runtimeFilter.notReprint) s += "\t\tNicht reiner Nachdruck\n";
    if (runtimeFilter.otherOnlyTb) s += "\t\tNur in TB\n";
    if (runtimeFilter.notOtherOnlyTb) s += "\t\tNicht sonst nur in TB\n";
    if (runtimeFilter.noPrint) s += "\t\tKeine Ausgabe\n";
    if (runtimeFilter.notNoPrint) s += "\t\tMindestens eine Ausgabe\n";
    if (runtimeFilter.onlyOnePrint) s += "\t\tEinzige Ausgabe\n";
    if (runtimeFilter.notOnlyOnePrint) s += "\t\tNicht nur einmal erschienen\n";
    if (runtimeFilter.onlyCollected) s += "\t\tGesammelt\n";
    if (runtimeFilter.onlyNotCollected) s += "\t\tNicht gesammelt\n";
    if (runtimeFilter.onlyNotCollectedNoOwnedVariants) s += "\t\tNicht gesammelt (keine Variante gesammelt)\n";

    if (runtimeFilter.publishers) {
      s += "\tVerlag: ";
      runtimeFilter.publishers.forEach((publisher) => {
        if (publisher?.name) s += publisher.name + ", ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (runtimeFilter.series) {
      s += "\tSerie: ";
      runtimeFilter.series.forEach((series) => {
        if (series?.title && series?.volume) s += series.title + " (Vol. " + series.volume + "), ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (runtimeFilter.genres && runtimeFilter.genres.length > 0) {
      const genres = dedupeTerms(
        runtimeFilter.genres
          .map((genre) => (typeof genre === "string" ? genre.trim() : ""))
          .filter((genre) => genre.length > 0)
      );
      if (genres.length > 0) s += "\tGenre: " + genres.join(", ") + "\n";
    }

    if (runtimeFilter.numbers) {
      s += "\tNummer: ";
      runtimeFilter.numbers.forEach((numberFilter) => {
        if (!numberFilter) return;
        s += "#" + numberFilter.number;
        if ("variant" in numberFilter && numberFilter.variant) s += " (" + numberFilter.variant + ")";
        s += " " + String(numberFilter.compare || "=") + ", ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (Array.isArray(runtimeFilter.arcs) && runtimeFilter.arcs.length > 0) {
      s += "\tStory Arc: ";
      runtimeFilter.arcs.forEach((arc) => {
        if (arc?.title) s += arc.title + ", ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (runtimeFilter.individuals) {
      s += "\tMitwirkende: ";
      runtimeFilter.individuals.forEach((individual) => {
        if (individual?.name) s += individual.name + ", ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (Array.isArray(runtimeFilter.appearances) && runtimeFilter.appearances.length > 0) {
      s += "\tAuftritte: ";
      runtimeFilter.appearances.forEach((appearance) => {
        if (appearance?.name) s += appearance.name + ", ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    if (Array.isArray(runtimeFilter.realities) && runtimeFilter.realities.length > 0) {
      s += "\tRealität: ";
      runtimeFilter.realities.forEach((reality) => {
        if (reality?.name) s += reality.name + ", ";
      });
      s = s.substring(0, s.length - 2) + "\n";
    }

    return s;
  }
}
