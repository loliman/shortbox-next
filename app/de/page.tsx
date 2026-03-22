import type { Metadata } from "next";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import Home from "@/src/components/Home";
import { readHomeFeed } from "@/src/lib/read/home-read";
import { parseFilter } from "@/src/components/nav-bar/listUtils";
import type { PreviewIssue } from "@/src/components/issue-preview/utils/issuePreviewUtils";
import { resolveAppPage } from "@/src/lib/routes/app-page";
import { createHomeMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createHomeMetadata(false);

export default async function DeHomePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const page = await resolveAppPage({ us: false, searchParams, session: "optional" });
  const filterQuery = typeof page.query?.filter === "string" ? page.query.filter : null;
  const initialHomeData = await readHomeFeed({
    us: false,
    offset: 0,
    limit: 50,
    order: typeof page.query?.order === "string" ? page.query.order : null,
    direction: typeof page.query?.direction === "string" ? page.query.direction : null,
    filter: parseFilter(filterQuery),
    loggedIn: Boolean(page.session?.loggedIn),
  });
  return (
    <AppPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
      initialFilterCount={page.navigationData?.initialFilterCount}
      initialPublisherNodes={page.navigationData?.initialPublisherNodes}
      initialSeriesNodesByPublisher={page.navigationData?.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={page.navigationData?.initialIssueNodesBySeriesKey}
    >
      <Home
        selected={page.selected}
        level={page.level}
        us={page.us}
        query={page.query}
        session={page.session}
        initialFilterCount={page.navigationData?.initialFilterCount}
        initialItems={initialHomeData.items.filter(Boolean) as PreviewIssue[]}
        initialHasMore={initialHomeData.hasMore}
        initialNextCursor={initialHomeData.nextCursor}
        initialPublisherNodes={page.navigationData?.initialPublisherNodes}
        initialSeriesNodesByPublisher={page.navigationData?.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={page.navigationData?.initialIssueNodesBySeriesKey}
      />
    </AppPageShell>
  );
}
