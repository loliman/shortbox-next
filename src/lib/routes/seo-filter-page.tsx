import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Home from "@/src/components/Home";
import { parseFilter } from "@/src/components/nav-bar/listUtils";
import type { PreviewIssue } from "@/src/components/issue-preview/utils/issuePreviewUtils";
import { readHomeFeed } from "@/src/lib/read/home-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { createPageMetadata, createRouteMetadata } from "@/src/lib/routes/metadata";
import { buildHierarchyLevel, normalizePageQuery } from "@/src/lib/routes/page-state";
import { readServerSession } from "@/src/lib/server/session";
import { resolveSeoFilterLanding, type SeoFilterKind } from "@/src/lib/routes/seo-filter-landing";

function withRouteFilter(
  query: Record<string, unknown> | null | undefined,
  routeFilterJson: string
): Record<string, unknown> {
  return {
    ...(query ?? {}),
    // Route-derived filter always wins so entity landing pages stay deterministic.
    filter: routeFilterJson,
  };
}

export async function generateSeoFilterPageMetadata(input: {
  us: boolean;
  kind: SeoFilterKind;
  slug: string;
  searchParams?: Record<string, string | string[] | undefined> | undefined;
}): Promise<Metadata> {
  const resolved = await resolveSeoFilterLanding({
    us: input.us,
    kind: input.kind,
    slug: input.slug,
  });

  if (!resolved) {
    return createPageMetadata({
      title: input.us ? "Filtered Issues | Shortbox" : "Gefilterte Hefte | Shortbox",
      description:
        "Filtered comic results on Shortbox, including issue details, story information, and related metadata.",
      noIndex: true,
    });
  }

  return createRouteMetadata({
    title: resolved.metadataTitle,
    description: resolved.metadataDescription,
    canonical: resolved.canonicalPath,
    searchParams: input.searchParams,
  });
}

export async function renderSeoFilterHomePage(input: {
  us: boolean;
  kind: SeoFilterKind;
  slug: string;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}) {
  const [resolvedSearchParams, session, resolvedFilter] = await Promise.all([
    input.searchParams,
    readServerSession(),
    resolveSeoFilterLanding({
      us: input.us,
      kind: input.kind,
      slug: input.slug,
    }),
  ]);

  if (!resolvedFilter) notFound();

  const baseQuery = normalizePageQuery(resolvedSearchParams);
  const query = withRouteFilter(baseQuery, resolvedFilter.filterQuery);

  const selected = { us: input.us };
  const level = buildHierarchyLevel(selected);
  const filterQuery = typeof query.filter === "string" ? query.filter : null;

  const [navigationData, initialHomeData] = await Promise.all([
    readInitialNavigationData({
      us: input.us,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
    readHomeFeed({
      us: input.us,
      offset: 0,
      limit: 50,
      order: typeof query.order === "string" ? query.order : null,
      direction: typeof query.direction === "string" ? query.direction : null,
      filter: parseFilter(filterQuery),
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);

  const visibleItems = initialHomeData.items.filter(Boolean) as PreviewIssue[];

  return (
    <Home
      selected={selected}
      level={level}
      us={input.us}
      query={query}
      session={session}
      initialFilterCount={navigationData.initialFilterCount}
      initialItems={visibleItems}
      initialHasMore={initialHomeData.hasMore}
      initialNextCursor={initialHomeData.nextCursor}
      seoSnapshot={{
        heading: `${resolvedFilter.entityLabel} - filtered issues`,
        items: visibleItems,
      }}
    />
  );
}

