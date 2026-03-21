import { IssueService } from "../../services/IssueService";

const DEFAULT_HOME_PAGE_SIZE = 50;

type HomeReadOptions = {
  us: boolean;
  offset?: number;
  limit?: number;
  order?: string | null;
  direction?: string | null;
  filter?: Record<string, unknown> | null;
};

export async function readHomeFeed(options: HomeReadOptions) {
  const limit = normalizePositiveInt(options.limit, DEFAULT_HOME_PAGE_SIZE);
  const offset = normalizePositiveInt(options.offset, 0);

  try {
    const service = new IssueService();
    const connection = await service.getLastEdited(
      {
        ...(options.filter || {}),
        us: options.us,
      },
      limit + offset + 1,
      undefined,
      options.order || undefined,
      options.direction || undefined,
      false
    );
    const nodes = connection.edges.map((edge) => edge?.node).filter(Boolean);
    const windowed = nodes.slice(offset, offset + limit + 1);
    const hasMore = windowed.length > limit;
    return {
      items: windowed.slice(0, limit),
      hasMore,
    };
  } catch {
    return {
      items: [],
      hasMore: false,
    };
  }
}

function normalizePositiveInt(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value as number));
}
