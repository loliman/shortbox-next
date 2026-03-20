"use client";

import { useEffect, useMemo } from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { createAppRouteContext, type AppRouteContextValue } from "../../app/routeContext";
import { generateLabel, HierarchyLevel } from "../../util/hierarchy";

export function useAppRouteContext(): AppRouteContextValue {
  const pathname = usePathname();
  const params = useParams<Record<string, string | string[]>>();
  const searchParams = useSearchParams();

  return useMemo(
    () =>
      createAppRouteContext({
        params,
        searchParams,
        us:
          pathname.indexOf("/us") === 0 ||
          pathname.indexOf("/edit/us") === 0 ||
          pathname.indexOf("/filter/us") === 0 ||
          pathname.indexOf("/report/us") === 0 ||
          pathname.indexOf("/copy/issue/us") === 0 ||
          pathname.indexOf("/create/issue/us") === 0,
        edit: pathname.indexOf("/edit") === 0,
        create: pathname.indexOf("/create") === 0,
      }),
    [params, pathname, searchParams]
  );
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
