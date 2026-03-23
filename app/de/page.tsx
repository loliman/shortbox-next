import type { Metadata } from "next";
import CatalogPageShell from "@/src/components/app-shell/CatalogPageShell";
import Home from "@/src/components/Home";
import { readHomeFeed } from "@/src/lib/read/home-read";
import { parseFilter } from "@/src/components/nav-bar/listUtils";
import type { PreviewIssue } from "@/src/components/issue-preview/utils/issuePreviewUtils";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { createHomeMetadata } from "@/src/lib/routes/metadata";
import { buildHierarchyLevel, normalizePageQuery } from "@/src/lib/routes/page-state";
import { readServerSession } from "@/src/lib/server/session";

export const metadata: Metadata = createHomeMetadata(false);

export default async function DeHomePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const [resolvedSearchParams, session] = await Promise.all([searchParams, readServerSession()]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = { us: false };
  const level = buildHierarchyLevel(selected);
  const filterQuery = typeof query?.filter === "string" ? query.filter : null;
  const [navigationData, initialHomeData] = await Promise.all([
    readInitialNavigationData({
      us: false,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
    readHomeFeed({
      us: false,
      offset: 0,
      limit: 50,
      order: typeof query?.order === "string" ? query.order : null,
      direction: typeof query?.direction === "string" ? query.direction : null,
      filter: parseFilter(filterQuery),
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  return (
    <CatalogPageShell
      selected={selected}
      level={level}
      us={false}
      lockViewportHeight={false}
      query={query}
      session={session}
      initialFilterCount={navigationData.initialFilterCount}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    >
      <Home
        selected={selected}
        level={level}
        us={false}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialItems={initialHomeData.items.filter(Boolean) as PreviewIssue[]}
        initialHasMore={initialHomeData.hasMore}
        initialNextCursor={initialHomeData.nextCursor}
        initialPublisherNodes={navigationData.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
      />
    </CatalogPageShell>
  );
}
