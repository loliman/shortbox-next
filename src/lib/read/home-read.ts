import "server-only";

import { readLastEditedIssues } from "./issue-feed-read";

const DEFAULT_HOME_PAGE_SIZE = 50;

type HomeReadOptions = {
  us: boolean;
  offset?: number;
  limit?: number;
  cursor?: string | null;
  order?: string | null;
  direction?: string | null;
  filter?: Record<string, unknown> | null;
  loggedIn?: boolean;
};

export async function readHomeFeed(options: HomeReadOptions) {
  const limit = normalizePositiveInt(options.limit, DEFAULT_HOME_PAGE_SIZE);
  const offset = normalizePositiveInt(options.offset, 0);
  const cursor = typeof options.cursor === "string" ? options.cursor || undefined : undefined;
  const requestedFirst = cursor ? limit : limit + offset + 1;

  const connection = await readLastEditedIssues(
    {
      ...(options.filter ?? {}),
      us: options.us,
    },
    requestedFirst,
    cursor,
    options.order ?? undefined,
    options.direction ?? undefined
  );
  const nodes = connection.edges.map((edge) => edge?.node).filter(Boolean);
  const windowed = cursor ? nodes.slice(0, limit) : nodes.slice(offset, offset + limit);
  return {
    items: windowed,
    hasMore: cursor
      ? Boolean(connection.pageInfo.hasNextPage)
      : nodes.length > offset + limit,
    nextCursor: cursor ? connection.pageInfo.endCursor ?? null : null,
  };
}

function normalizePositiveInt(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value as number));
}
