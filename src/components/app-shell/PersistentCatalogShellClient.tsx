"use client";

import React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import FooterLinks from "../footer/FooterLinks";
import LayoutChromeClient from "../LayoutChromeClient";
import AddFab from "../fab/AddFab";
import ErrorFab from "../fab/ErrorFab";
import { COMPACT_BOTTOM_BAR_CLEARANCE, getNavDrawerWidth } from "../layoutMetrics";
import { useInitialResponsiveGuess } from "../../app/responsiveGuessContext";
import { getHierarchyLevel, getSelected, HierarchyLevel } from "../../util/hierarchy";
import type { SessionData } from "../../app/session";
import type { IssueNode, PublisherNode, SeriesNode } from "../nav-bar/listTreeUtils";
import { parseSeoFilterRoutePathname } from "../../lib/routes/seo-filter-route";

type NavigationState = {
  initialPublisherNodes?: PublisherNode[];
  initialSeriesNodesByPublisher?: Record<string, SeriesNode[]>;
  initialIssueNodesBySeriesKey?: Record<string, IssueNode[]>;
  initialFilterCount?: number;
  resolvedFilterQuery?: string | null;
};

type PersistentCatalogShellClientProps = {
  children: React.ReactNode;
  us: boolean;
  session?: SessionData | null;
  changeRequestsCount?: number;
};

export default function PersistentCatalogShellClient(
  props: Readonly<PersistentCatalogShellClientProps>
) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialGuess = useInitialResponsiveGuess();
  const [navigationState, setNavigationState] = React.useState<NavigationState | null>(null);
  const [navigationLoading, setNavigationLoading] = React.useState(true);
  const routeFilter = React.useMemo(() => parseSeoFilterRoutePathname(pathname), [pathname]);
  const query = React.useMemo(() => {
    const entries = Array.from(searchParams.entries());
    const nextQuery = entries.length > 0 ? Object.fromEntries(entries) : {};

    if (navigationState && navigationState.resolvedFilterQuery) {
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
  const lockViewportHeight = level !== HierarchyLevel.ROOT;

  React.useEffect(() => {
    const controller = new AbortController();
    setNavigationLoading(true);

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
        setNavigationLoading(false);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string } | null)?.name === "AbortError") return;
        setNavigationLoading(false);
      });

    return () => controller.abort();
  }, [pathname, routeFilter, searchParams, props.us]);

  const initialTablet = !initialGuess?.isPhone && !initialGuess?.isDesktop;
  const initialNavWide =
    Boolean(initialGuess?.isDesktop) || Boolean(initialTablet && initialGuess?.isLandscape);
  const initialNavOffset = initialNavWide ? `${getNavDrawerWidth(false)}px` : "0px";
  const initialNavGutter = initialGuess?.isDesktop ? `${getNavDrawerWidth(false)}px` : "0px";

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        height: lockViewportHeight ? { xs: "auto", lg: "100dvh" } : "auto",
        overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.default",
      }}
    >
      <LayoutChromeClient
        selected={selected}
        us={props.us}
        showNavigation={true}
        query={query}
        initialPublisherNodes={navigationState?.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationState?.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={navigationState?.initialIssueNodesBySeriesKey}
        session={props.session}
        initialFilterCount={navigationState?.initialFilterCount}
        changeRequestsCount={props.changeRequestsCount ?? 0}
        navigationLoading={navigationLoading}
      />

      {props.session?.canWrite ? (
        <AddFab session={props.session} level={level} selected={selected} us={props.us} />
      ) : props.us ? null : (
        <ErrorFab level={level} selected={selected} us={props.us} />
      )}

      <Box
        component="main"
        sx={{
          display: "flex",
          flexGrow: 1,
          minHeight: 0,
          overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
          backgroundColor: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexGrow: 1,
            minWidth: 0,
            minHeight: 0,
            overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
            backgroundColor: "background.default",
            pl: {
              xs: 0,
              sm: 2,
              lg: `calc((var(--shortbox-nav-gutter, ${initialNavGutter}) / 2) + 8px)`,
            },
            pr: {
              xs: 0,
              sm: 2,
              lg: `max(16px, calc((var(--shortbox-nav-gutter, ${initialNavGutter}) / 2) + 8px - (var(--shortbox-nav-offset, ${initialNavOffset}) / 2)))`,
            },
            pt: { xs: 0, sm: 2 },
            pb: { xs: COMPACT_BOTTOM_BAR_CLEARANCE, sm: COMPACT_BOTTOM_BAR_CLEARANCE, lg: 2 },
            ml: {
              xs: `var(--shortbox-nav-offset, ${initialNavOffset})`,
              lg: `calc(var(--shortbox-nav-offset, ${initialNavOffset}) / 2)`,
            },
            transition:
              "margin-left 225ms cubic-bezier(0.4, 0, 0.6, 1), padding 225ms cubic-bezier(0.4, 0, 0.6, 1)",
          }}
        >
          <Card
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              minWidth: 0,
              minHeight: 0,
              overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
              backgroundColor: "background.paper",
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                px: { xs: 0, sm: 2 },
                pt: { xs: 0, sm: 2 },
                pb: 0,
                minHeight: 0,
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  right: { xs: -12, sm: -16 },
                  bottom: { xs: -12, sm: -16 },
                  width: "min(100%, 70vw)",
                  height: "45%",
                  backgroundImage: "url('/background.png')",
                  backgroundPosition: "right bottom",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "contain",
                  opacity: 0.04,
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
              <Box
                className="main-content"
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  overflow: lockViewportHeight ? { xs: "visible", lg: "hidden" } : "visible",
                }}
              >
                {props.children}
              </Box>
            </Box>

            <Box
              sx={{
                mt: "auto",
                px: { xs: 0, sm: 2 },
                pt: 1.25,
                pb: { xs: 0, sm: 1.25 },
                borderTop: 1,
                borderColor: "divider",
                backgroundColor: "background.paper",
                position: "sticky",
                bottom: 0,
                zIndex: 1,
                display: "flex",
                justifyContent: { xs: "center", sm: "flex-end" },
              }}
            >
              <FooterLinks />
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
