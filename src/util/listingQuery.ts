import { parseAndNormalizeLegacyFilter } from "./filter-normalization";

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

export function parseListingFilter(query: ListingQuery, us: boolean): Record<string, unknown> {
  const normalized = parseAndNormalizeLegacyFilter(query?.filter, {
    mode: "non-array",
    includeRealities: true,
  });
  if (!normalized) return { us };

  return { ...normalized, us };
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
