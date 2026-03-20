import type { Connection, Edge, Filter } from "../types/query-data";
import type { Publisher } from "../types/domain";
import { prisma } from "../lib/prisma/client";
import {
  createPublisher as createPublisherWrite,
  deletePublisherByLookup,
  editPublisher as editPublisherWrite,
} from "../lib/server/publishers-write";

type PublisherInput = {
  id?: string | number | null;
  name?: string | null;
  us?: boolean | null;
  addinfo?: string | null;
  startyear?: number | null;
  endyear?: number | null;
};

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

function normalizePattern(pattern?: string) {
  return String(pattern || "").trim();
}

function serializePublisher(row: {
  id: bigint;
  name: string;
  original: boolean;
  addInfo?: string | null;
  startYear?: bigint | null;
  endYear?: bigint | null;
}): Publisher {
  return {
    id: String(row.id),
    name: row.name,
    us: row.original,
    addinfo: row.addInfo ?? null,
    startyear: row.startYear === null || row.startYear === undefined ? null : Number(row.startYear),
    endyear: row.endYear === null || row.endYear === undefined ? null : Number(row.endYear),
  };
}

export class PublisherService {
  constructor(private requestId?: string) {
    void this.requestId;
  }

  async findPublishers(
    pattern: string | undefined,
    us: boolean,
    first: number | undefined,
    after: string | undefined,
    loggedIn: boolean,
    filter: Filter | undefined
  ) {
    void after;
    void loggedIn;
    void filter;

    const normalizedPattern = normalizePattern(pattern);
    const take = Number.isFinite(first) && first && first > 0 ? Math.floor(first) : undefined;

    const rows = await prisma.publisher.findMany({
      where: {
        original: us,
        ...(normalizedPattern
          ? {
              name: {
                contains: normalizedPattern,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      ...(take ? { take } : {}),
    });

    const nodes = rows.map((row) => serializePublisher(row));
    return buildConnectionFromNodes(nodes);
  }

  async deletePublisher(item: PublisherInput) {
    return deletePublisherByLookup({
      id: item.id ?? undefined,
      name: item.name ?? undefined,
      us: item.us ?? undefined,
      addinfo: item.addinfo ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
    });
  }

  async createPublisher(item: PublisherInput) {
    return createPublisherWrite({
      id: item.id ?? undefined,
      name: item.name ?? undefined,
      us: Boolean(item.us),
      addinfo: item.addinfo ?? undefined,
      startyear: item.startyear ?? undefined,
      endyear: item.endyear ?? undefined,
    });
  }

  async editPublisher(oldItem: PublisherInput, item: PublisherInput) {
    return editPublisherWrite(
      {
        id: oldItem.id ?? undefined,
        name: oldItem.name ?? undefined,
        us: oldItem.us ?? undefined,
        addinfo: oldItem.addinfo ?? undefined,
        startyear: oldItem.startyear ?? undefined,
        endyear: oldItem.endyear ?? undefined,
      },
      {
        id: item.id ?? undefined,
        name: item.name ?? undefined,
        us: item.us ?? undefined,
        addinfo: item.addinfo ?? undefined,
        startyear: item.startyear ?? undefined,
        endyear: item.endyear ?? undefined,
      }
    );
  }

  async getPublishersByIds(ids: readonly number[]) {
    if (ids.length === 0) return [];

    const rows = await prisma.publisher.findMany({
      where: {
        id: {
          in: ids.map((id) => BigInt(id)),
        },
      },
    });

    const byId = new Map(rows.map((row) => [Number(row.id), serializePublisher(row)]));
    return ids.map((id) => byId.get(id) ?? null);
  }
}
