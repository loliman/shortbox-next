import type { SelectedRoot } from "../types/domain";
import { getHierarchyLevel, getSelected } from "../util/hierarchy";

type UnknownRecord = Record<string, unknown>;

export type AppRouteContextValue = {
  edit: boolean;
  create: boolean;
  us: boolean;
  selected: SelectedRoot;
  query: UnknownRecord | null;
  level: string;
};

type RouteSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

type RouteParams = Record<string, string | string[] | undefined> | null | undefined;

function normalizeParams(params: RouteParams): Record<string, string> {
  if (!params) return {};

  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value != null)
      .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  ) as Record<string, string>;
}

function normalizeQuery(searchParams: RouteSearchParams): UnknownRecord | null {
  if (!searchParams) return null;

  if (searchParams instanceof URLSearchParams) {
    const entries = Array.from(searchParams.entries());
    return entries.length > 0 ? (Object.fromEntries(entries) as UnknownRecord) : null;
  }

  const queryEntries = Object.entries(searchParams).flatMap(([key, value]) => {
    if (value == null) return [];
    if (Array.isArray(value)) return value.length > 0 ? [[key, value[0]]] : [];
    return [[key, value]];
  });

  return queryEntries.length > 0 ? (Object.fromEntries(queryEntries) as UnknownRecord) : null;
}

export function createAppRouteContext(options: {
  params?: RouteParams;
  searchParams?: RouteSearchParams;
  us?: boolean;
  edit?: boolean;
  create?: boolean;
}): AppRouteContextValue {
  const normalizedParams = normalizeParams(options.params);
  const us = Boolean(options.us);
  const selected = getSelected(normalizedParams, us);

  return {
    edit: Boolean(options.edit),
    create: Boolean(options.create),
    us,
    selected,
    query: normalizeQuery(options.searchParams),
    level: getHierarchyLevel(selected),
  };
}
