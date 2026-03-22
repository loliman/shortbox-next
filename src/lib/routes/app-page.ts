import "server-only";

import { readInitialNavigationData } from "../read/navigation-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "./page-state";
import { requirePageAdminSession, requirePageSession, requirePageWriteSession } from "../server/guards";
import { readServerSession } from "../server/session";
import type { SessionData } from "../../app/session";
import type { InitialNavigationData } from "../read/navigation-read";
import type { LayoutRouteData } from "../../types/route-ui";

type Awaitable<T> = T | Promise<T>;
type RouteParamsInput = Record<string, string | string[] | undefined> | undefined;
type RouteSearchParamsInput = Record<string, string | string[] | undefined> | undefined;
type SessionMode = "none" | "optional" | "required" | "write" | "admin";

type ResolveAppPageOptions = {
  us: boolean;
  params?: Awaitable<RouteParamsInput>;
  searchParams?: Awaitable<RouteSearchParamsInput>;
  includeNavigation?: boolean;
  session?: SessionMode;
};

type ResolvedAppPage = {
  selected: LayoutRouteData["selected"];
  level: LayoutRouteData["level"];
  us: boolean;
  query: LayoutRouteData["query"];
  session: SessionData | null;
  navigationData: InitialNavigationData | null;
};

async function resolveSession(mode: SessionMode | undefined) {
  if (mode === "required") return requirePageSession();
  if (mode === "write") return requirePageWriteSession();
  if (mode === "admin") return requirePageAdminSession();
  if (mode === "optional") return readServerSession();
  return null;
}

export async function resolveAppPage(options: Readonly<ResolveAppPageOptions>): Promise<ResolvedAppPage> {
  const resolvedParams = await options.params;
  const resolvedSearchParams = await options.searchParams;
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, options.us);
  const level = buildHierarchyLevel(selected);
  const session = await resolveSession(options.session);
  const navigationData =
    options.includeNavigation === false
      ? null
      : await readInitialNavigationData({
          us: options.us,
          query,
          selected,
          loggedIn: Boolean(session?.loggedIn),
        });

  return {
    selected,
    level,
    us: options.us,
    query,
    session,
    navigationData,
  };
}
