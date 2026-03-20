import type { Connection, Edge, Filter } from "../types/query-data";
import type { Publisher, Series } from "../types/domain";
import { prisma } from "../lib/prisma/client";
import {
  createSeries as createSeriesWrite,
  deleteSeriesByLookup,
  editSeries as editSeriesWrite,
} from "../lib/server/series-write";

type PublisherInput = {
  id?: string | number | null;
  name?: string | null;
  us?: boolean | null;
};

type SeriesInput = {
  id?: string | number | null;
  title?: string | null;
  startyear?: number | null;
  endyear?: number | null;
  volume?: number | null;
  genre?: string | null;
  addinfo?: string | null;
  publisher?: PublisherInput | null;
};

const LEADING_ARTICLE_REGEX = /^(der|die|das|the)\s+/i;
const SPECIAL_SORT_CHARACTERS_REGEX = /[^\p{L}\p{N}\s]/gu;

const normalizeGermanSortLetters = (value: string): string =>
  value
    .replace(/ä/gi, "a")
    .replace(/ö/gi, "o")
    .replace(/ü/gi, "u")
    .replace(/ß/g, "ss")
    .replace(/ẞ/g, "ss");

const normalizeSeriesTitleForSort = (value: string | null | undefined): string =>
  normalizeGermanSortLetters(
    String(value || "")
      .trim()
      .replace(LEADING_ARTICLE_REGEX, "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(SPECIAL_SORT_CHARACTERS_REGEX, " ")
      .replace(/\s+/g, " ")
  )
    .trim()
    .toLocaleLowerCase("de-DE");

const normalizeSeriesTitleForTieBreak = (value: string | null | undefined): string =>
  normalizeSeriesTitleForSort(value);

const compareSeriesTitles = (
  left: { title?: string | null; volume?: number | null; id?: number | null },
  right: { title?: string | null; volume?: number | null; id?: number | null }
): number =>
  normalizeSeriesTitleForSort(left.title).localeCompare(
    normalizeSeriesTitleForSort(right.title),
    "de-DE",
    {
      sensitivity: "base",
    }
  ) ||
  normalizeSeriesTitleForTieBreak(left.title).localeCompare(
    normalizeSeriesTitleForTieBreak(right.title),
    "de-DE",
    {
      sensitivity: "base",
    }
  ) ||
  Number(left.volume || 0) - Number(right.volume || 0) ||
  Number(left.id || 0) - Number(right.id || 0);

const compareSerializedSeries = (left: Series, right: Series): number =>
  compareSeriesTitles(
    {
      title: left.title,
      volume: left.volume,
      id:
        typeof left.id === "number"
          ? left.id
          : left.id === null || left.id === undefined
            ? null
            : Number(left.id),
    },
    {
      title: right.title,
      volume: right.volume,
      id:
        typeof right.id === "number"
          ? right.id
          : right.id === null || right.id === undefined
            ? null
            : Number(right.id),
    }
  );

function buildConnectionFromNodes<T>(nodes: T[]): Connection<T> {
  const edges: Array<Edge<T>> = nodes.map((node, index) => ({
    cursor: String(index),
    node,
  }));

  return {
    edges,
    pageInfo: {
      endCursor: edges.length > 0 ? edges[edges.length - 1]?.cursor ?? null : null,
      hasNextPage: false,
    },
  };
}

function serializePublisher(row: {
  id: bigint;
  name: string;
  original: boolean;
} | null): Publisher | undefined {
  if (!row) return undefined;
  return {
    id: String(row.id),
    name: row.name,
    us: row.original,
  };
}

function serializeSeries(row: {
  id: bigint;
  title: string | null;
  volume: bigint;
  startYear: bigint;
  endYear: bigint | null;
  genre: string | null;
  addInfo: string;
  publisher: {
    id: bigint;
    name: string;
    original: boolean;
  } | null;
}): Series {
  return {
    id: String(row.id),
    title: row.title || "",
    volume: Number(row.volume),
    startyear: Number(row.startYear),
    endyear: row.endYear === null ? null : Number(row.endYear),
    genre: row.genre || "",
    addinfo: row.addInfo,
    publisher: serializePublisher(row.publisher) || { name: "", us: false },
  };
}

export class SeriesService {
  constructor(private requestId?: string) {
    void this.requestId;
  }

  async findSeries(
    pattern: string | undefined,
    publisher: PublisherInput,
    first: number | undefined,
    after: string | undefined,
    loggedIn: boolean,
    filter: Filter | undefined
  ) {
    void after;
    void loggedIn;
    void filter;

    const publisherName = typeof publisher?.name === "string" ? publisher.name.trim() : "";
    const shouldFilterPublisherName = publisherName !== "" && publisherName !== "*";
    const shouldFilterPublisherUs = typeof publisher?.us === "boolean";
    const normalizedPattern = String(pattern || "").trim();
    const take = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : undefined;

    const rows = await prisma.series.findMany({
      where: {
        ...(shouldFilterPublisherName || shouldFilterPublisherUs
          ? {
              publisher: {
                ...(shouldFilterPublisherName ? { name: publisherName } : {}),
                ...(shouldFilterPublisherUs ? { original: Boolean(publisher.us) } : {}),
              },
            }
          : {}),
        ...(normalizedPattern
          ? {
              title: {
                contains: normalizedPattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        publisher: true,
      },
      ...(take ? { take } : {}),
    });

    const nodes = rows
      .map((row) => serializeSeries(row))
      .sort(compareSerializedSeries);

    return buildConnectionFromNodes(nodes);
  }

  async deleteSeries(item: SeriesInput) {
    return deleteSeriesByLookup({
      title: item.title ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
      volume: item.volume ?? undefined,
      genre: item.genre ?? undefined,
      addinfo: item.addinfo ?? undefined,
      publisher: item.publisher
        ? {
            name: item.publisher.name ?? undefined,
            us: item.publisher.us ?? undefined,
          }
        : undefined,
    });
  }

  async createSeries(item: SeriesInput) {
    return createSeriesWrite({
      title: item.title ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
      volume: item.volume ?? undefined,
      genre: item.genre ?? undefined,
      addinfo: item.addinfo ?? undefined,
      publisher: item.publisher
        ? {
            name: item.publisher.name ?? undefined,
            us: item.publisher.us ?? undefined,
          }
        : undefined,
    });
  }

  async editSeries(oldItem: SeriesInput, item: SeriesInput) {
    return editSeriesWrite(
      {
        title: oldItem.title ?? undefined,
        startyear: oldItem.startyear ?? undefined,
        endyear: oldItem.endyear ?? undefined,
        volume: oldItem.volume ?? undefined,
        genre: oldItem.genre ?? undefined,
        addinfo: oldItem.addinfo ?? undefined,
        publisher: oldItem.publisher
          ? {
              name: oldItem.publisher.name ?? undefined,
              us: oldItem.publisher.us ?? undefined,
            }
          : undefined,
      },
      {
        title: item.title ?? undefined,
        startyear: item.startyear ?? undefined,
        endyear: item.endyear ?? undefined,
        volume: item.volume ?? undefined,
        genre: item.genre ?? undefined,
        addinfo: item.addinfo ?? undefined,
        publisher: item.publisher
          ? {
              name: item.publisher.name ?? undefined,
              us: item.publisher.us ?? undefined,
            }
          : undefined,
      }
    );
  }

  async getSeriesByIds(ids: readonly number[]) {
    if (ids.length === 0) return [];

    const rows = await prisma.series.findMany({
      where: {
        id: {
          in: ids.map((id) => BigInt(id)),
        },
      },
      include: {
        publisher: true,
      },
    });

    const byId = new Map(rows.map((row) => [Number(row.id), serializeSeries(row)]));
    return ids.map((id) => byId.get(id) ?? null);
  }
}
