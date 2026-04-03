import "server-only";

import { resolveSeoFilterLanding } from "./seo-filter-landing";
import { isSeoFilterKind } from "./seo-filter-route";

export async function resolveNavigationFilterQuery(input: {
  us: boolean;
  filter?: string | null;
  routeFilterKind?: string | null;
  routeFilterSlug?: string | null;
}): Promise<string | null> {
  const explicitFilter = typeof input.filter === "string" ? input.filter.trim() : "";
  if (explicitFilter) return explicitFilter;

  const kind = typeof input.routeFilterKind === "string" ? input.routeFilterKind.trim() : "";
  const slug = typeof input.routeFilterSlug === "string" ? input.routeFilterSlug.trim() : "";
  if (!isSeoFilterKind(kind) || !slug) return null;

  const resolved = await resolveSeoFilterLanding({
    us: input.us,
    kind,
    slug,
  });

  return resolved?.filterQuery ?? null;
}
