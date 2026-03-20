export type ListingQuery =
  | {
      filter?: string | null;
      order?: string | null;
      direction?: string | null;
      view?: string | null;
    }
  | null
  | undefined;

export const DEFAULT_ORDER = "updatedat";
export const DEFAULT_DIRECTION = "DESC";

function splitMultiFilterString(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return value
    .split("||")
    .map((entry) => entry.trim())
    .filter((entry, index, arr) => entry.length > 0 && arr.indexOf(entry) === index);
}

function normalizeLegacyFilter(payload: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...payload };

  if (!Array.isArray(normalized.arcs)) {
    const arcTitles = splitMultiFilterString(normalized.arcs);
    normalized.arcs = arcTitles.map((title) => ({ title }));
  }

  if (!Array.isArray(normalized.appearances)) {
    const appearanceNames = splitMultiFilterString(normalized.appearances);
    normalized.appearances = appearanceNames.map((name) => ({ name }));
  }

  if (!Array.isArray(normalized.realities)) {
    const realityNames = splitMultiFilterString(normalized.realities);
    normalized.realities = realityNames.map((name) => ({ name }));
  }

  if (normalized.noComicguideId === undefined && normalized.noCover !== undefined) {
    normalized.noComicguideId = Boolean(normalized.noCover);
  }

  if (Boolean(normalized.onlyCollected) && Boolean(normalized.onlyNotCollected)) {
    normalized.onlyNotCollected = false;
  }

  delete normalized.noCover;
  delete normalized.sellable;
  delete normalized.and;

  return normalized;
}

export function parseListingFilter(query: ListingQuery, us: boolean): Record<string, unknown> {
  if (!query?.filter) return { us };

  try {
    const parsed = JSON.parse(query.filter);
    if (!parsed || typeof parsed !== "object") return { us };
    return { ...normalizeLegacyFilter(parsed as Record<string, unknown>), us };
  } catch {
    return { us };
  }
}

export function getListingOrder(query: ListingQuery): string {
  return query?.order || DEFAULT_ORDER;
}

export function getListingDirection(query: ListingQuery): string {
  return query?.direction || DEFAULT_DIRECTION;
}

export function getListingView(query: ListingQuery): "strip" | "gallery" {
  return query?.view === "gallery" ? "gallery" : "strip";
}

export function buildSortNavigationQuery(
  query: ListingQuery,
  patch: Partial<{ order: string | null; direction: string | null; view: string | null }>
) {
  return {
    filter: query?.filter || null,
    order: patch.order !== undefined ? patch.order : getListingOrder(query),
    direction: patch.direction !== undefined ? patch.direction : getListingDirection(query),
    view: patch.view !== undefined ? patch.view : getListingView(query),
  };
}
