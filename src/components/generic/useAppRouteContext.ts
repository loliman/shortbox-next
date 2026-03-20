"use client";

import { useEffect, useMemo } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import queryString from "query-string";
import type { SelectedRoot } from "../../types/domain";
import {
  generateLabel,
  getHierarchyLevel,
  getSelected,
  HierarchyLevel,
} from "../../util/hierarchy";

type UnknownRecord = Record<string, unknown>;

export type AppRouteContextValue = {
  edit: boolean;
  create: boolean;
  us: boolean;
  selected: SelectedRoot;
  query: UnknownRecord | null;
  level: string;
};

export function useAppRouteContext(): AppRouteContextValue {
  const pathname = usePathname();
  const params = useParams<Record<string, string | string[]>>();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";
  const normalizedParams = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
      ) as Record<string, string>,
    [params]
  );

  const us =
    pathname.indexOf("/us") === 0 ||
    pathname.indexOf("/edit/us") === 0 ||
    pathname.indexOf("/filter/us") === 0 ||
    pathname.indexOf("/report/us") === 0;
  const selected = getSelected(normalizedParams, us);
  const currentQuery = search ? (queryString.parse(`?${search}`) as UnknownRecord) : null;

  return {
    edit: pathname.indexOf("/edit") === 0,
    create: pathname.indexOf("/create") === 0,
    us,
    selected,
    query: currentQuery,
    level: getHierarchyLevel(selected),
  };
}

export function useAppTitle(): string {
  const routeContext = useAppRouteContext();
  const pathname = usePathname();

  return createAppTitle(routeContext, pathname);
}

export function useSyncAppTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

export function createAppTitle(
  params: Pick<AppRouteContextValue, "edit" | "create" | "selected" | "us" | "level">,
  url: string
): string {
  let title: string;
  if (params.edit) title = generateLabel(params.selected) + " bearbeiten";
  else if (params.create) {
    if (url.indexOf("/issue") !== -1) title = "Ausgabe";
    else if (url.indexOf("/series") !== -1) title = "Serie";
    else title = "Verlag";

    title += " erstellen";
  } else {
    title = generateLabel(params.selected);
  }

  if (params.us) title += " | US";
  if (params.level !== HierarchyLevel.ROOT || params.edit || params.create) title += " - Shortbox";

  return title;
}
