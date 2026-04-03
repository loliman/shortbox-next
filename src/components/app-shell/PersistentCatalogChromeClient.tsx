"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import LayoutChromeClient from "../LayoutChromeClient";
import { getHierarchyLevel, getSelected, HierarchyLevel } from "../../lib/routes/hierarchy";
import type { SessionData } from "../../types/session";
import { parseSeoFilterRoutePathname } from "../../lib/routes/seo-filter-route";
import type { IssueNode, PublisherNode, SeriesNode } from "../nav-bar/listTreeUtils";
import { useNavigationFeedbackContext } from "../generic/AppContext";
import {
  markNavPerf,
  measureNavPerf,
  observeNavLongTasks,
  resetNavPerfSession,
} from "../nav-bar/navPerfDebug";

const DeferredAddFab = dynamic(() => import("../fab/AddFab"), {
  ssr: false,
  loading: () => null,
});

const DeferredErrorFab = dynamic(() => import("../fab/ErrorFab"), {
  ssr: false,
  loading: () => null,
});

type NavigationState = {
  initialPublisherNodes?: PublisherNode[];
  initialSeriesNodesByPublisher?: Record<string, SeriesNode[]>;
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  initialFilterCount?: number;
  resolvedFilterQuery?: string | null;
};

type PersistentCatalogChromeClientProps = {
  us: boolean;
  session?: SessionData | null;
  changeRequestsCount?: number;
  previewImportActive?: boolean;
};

export default function PersistentCatalogChromeClient(
  props: Readonly<PersistentCatalogChromeClientProps>
) {
  const navigationFeedback = useNavigationFeedbackContext();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigationState, setNavigationState] = React.useState<NavigationState | null>(null);
  const [navigationStateRouteKey, setNavigationStateRouteKey] = React.useState<string | null>(null);
  const [navigationLoading, setNavigationLoading] = React.useState(true);
  const routeFilter = React.useMemo(() => parseSeoFilterRoutePathname(pathname), [pathname]);
  const query = React.useMemo(() => {
    const entries = Array.from(searchParams.entries());
    const nextQuery = entries.length > 0 ? Object.fromEntries(entries) : {};

    if (navigationState?.resolvedFilterQuery) {
      nextQuery.filter = navigationState.resolvedFilterQuery;
    }

    if (routeFilter) {
      nextQuery.routeFilterKind = routeFilter.kind;
      nextQuery.routeFilterSlug = routeFilter.slug;
    }

    return Object.keys(nextQuery).length > 0 ? nextQuery : null;
  }, [navigationState, routeFilter, searchParams]);
  const selected = React.useMemo(() => {
    if (routeFilter) return { us: props.us };

    const parts = (pathname || "").split("/").filter(Boolean);
    const params = {
      publisher: parts[1],
      series: parts[2],
      issue: parts[3],
      format: parts[4],
      variant: parts[5],
    };
    return getSelected(params, props.us);
  }, [pathname, props.us, routeFilter]);
  const level = React.useMemo(() => getHierarchyLevel(selected), [selected]);
  const routeKey = React.useMemo(
    () => `${pathname || ""}?${searchParams?.toString() || ""}`,
    [pathname, searchParams]
  );
  const routeScopedNavigationState =
    navigationStateRouteKey === routeKey ? navigationState : null;

  React.useEffect(() => {
    resetNavPerfSession(routeKey, {
      us: props.us,
      pathname,
      routeFilterKind: routeFilter?.kind ?? null,
      routeFilterSlug: routeFilter?.slug ?? null,
    });
    const disconnectLongTasks = observeNavLongTasks();
    markNavPerf("chrome:init");
    return () => {
      disconnectLongTasks();
    };
  }, [pathname, props.us, routeFilter?.kind, routeFilter?.slug, routeKey]);

  React.useEffect(() => {
    navigationFeedback.setNavigationPayloadLoading(navigationLoading);
    if (!navigationLoading) {
      markNavPerf("chrome:ready");
      measureNavPerf("chrome:init-to-ready", "chrome:init", "chrome:ready");
    }
  }, [navigationFeedback, navigationLoading]);

  React.useEffect(() => {
    return () => {
      navigationFeedback.setNavigationPayloadLoading(false);
    };
  }, [navigationFeedback]);

  React.useEffect(() => {
    setNavigationStateRouteKey(null);
    const controller = new AbortController();
    setNavigationLoading(true);
    markNavPerf("navigation-state:fetch:start", {
      pathname,
      filter: searchParams.get("filter"),
    });

    const params = new URLSearchParams({ us: String(props.us) });
    const parts = (pathname || "").split("/").filter(Boolean);
    if (routeFilter) {
      params.set("routeFilterKind", routeFilter.kind);
      params.set("routeFilterSlug", routeFilter.slug);
    } else {
      if (parts[1]) params.set("publisher", parts[1]);
      if (parts[2]) params.set("series", parts[2]);
      if (parts[3]) params.set("issue", parts[3]);
      if (parts[4]) params.set("format", parts[4]);
      if (parts[5]) params.set("variant", parts[5]);
    }

    const filter = searchParams.get("filter");
    if (filter) params.set("filter", filter);

    fetch(`/api/public-navigation-state?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as NavigationState;
      })
      .then((data) => {
        if (!data) return;
        setNavigationState(data);
        setNavigationStateRouteKey(routeKey);
        markNavPerf("navigation-state:fetch:end", {
          publishers: data.initialPublisherNodes?.length ?? 0,
          resolvedFilterQuery: data.resolvedFilterQuery ?? null,
        });
        measureNavPerf(
          "navigation-state:fetch",
          "navigation-state:fetch:start",
          "navigation-state:fetch:end"
        );
        setNavigationLoading(false);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        markNavPerf("navigation-state:fetch:error", {
          message: error instanceof Error ? error.message : String(error),
        });
        setNavigationLoading(false);
      });

    return () => controller.abort();
  }, [pathname, props.us, routeFilter, routeKey, searchParams]);

  return (
    <>
      <LayoutChromeClient
        selected={selected}
        us={props.us}
        showNavigation={true}
        query={query}
        initialPublisherNodes={routeScopedNavigationState?.initialPublisherNodes}
        initialSeriesNodesByPublisher={routeScopedNavigationState?.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={routeScopedNavigationState?.initialIssueNodesBySeriesKey}
        session={props.session}
        initialFilterCount={routeScopedNavigationState?.initialFilterCount}
        changeRequestsCount={props.changeRequestsCount ?? 0}
        navigationLoading={navigationLoading}
      />

      {props.session?.canWrite ? (
        <DeferredAddFab
          session={props.session}
          level={level}
          selected={selected}
          us={props.us}
          previewImportActive={props.previewImportActive}
        />
      ) : null}
      {!props.session?.canWrite && !props.us && level !== HierarchyLevel.ROOT ? (
        <DeferredErrorFab level={level} selected={selected} us={props.us} />
      ) : null}
    </>
  );
}
