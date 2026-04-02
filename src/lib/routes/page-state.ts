import "server-only";

import { getHierarchyLevel, getSelected } from "./hierarchy";
import type { RouteParams, SelectedRoot } from "../../types/domain";
import type { RouteQuery } from "../../types/route-ui";

type PageParamsInput = Record<string, string | string[] | undefined> | null | undefined;
type PageSearchParamsInput = Record<string, string | string[] | undefined> | null | undefined;

export function normalizePageParams(params: PageParamsInput): Record<string, string> {
  if (!params) return {};

  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value != null)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  ) as Record<string, string>;
}

export function normalizePageQuery(searchParams: PageSearchParamsInput): RouteQuery | null {
  if (!searchParams) return null;

  const entries = Object.entries(searchParams).flatMap(([key, value]) => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.length > 0 ? [[key, value[0]]] : [];
    return [[key, value]];
  });

  return entries.length > 0 ? (Object.fromEntries(entries) as RouteQuery) : null;
}

export function buildSelectedRoot(params: PageParamsInput, us: boolean): SelectedRoot {
  return getSelected(normalizePageParams(params) as RouteParams, us);
}

export function buildHierarchyLevel(selected: SelectedRoot) {
  return getHierarchyLevel(selected);
}
