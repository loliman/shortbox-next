import type { Metadata } from "next";
import Home from "@/src/components/Home";
import { readHomeFeed } from "@/src/lib/read/home-read";
import { parseFilter } from "@/src/components/nav-bar/listUtils";
import type { PreviewIssue } from "@/src/components/issue-preview/utils/issuePreviewUtils";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { createHomeMetadata } from "@/src/lib/routes/metadata";
import { buildHierarchyLevel, normalizePageQuery } from "@/src/lib/routes/page-state";
import { isDatabaseUnavailable } from "@/src/lib/prisma/is-database-unavailable";
import { readServerSession } from "@/src/lib/server/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  return createHomeMetadata(true, resolvedSearchParams);
}

export default async function UsHomePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const [resolvedSearchParams, session] = await Promise.all([searchParams, readServerSession()]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = { us: true };
  const level = buildHierarchyLevel(selected);
  const filterQuery = typeof query?.filter === "string" ? query.filter : null;
  let initialFilterCount = 0;
  let initialItems: PreviewIssue[] = [];
  let initialHasMore = false;
  let initialNextCursor: string | null = null;

  try {
    const [navigationData, initialHomeData] = await Promise.all([
      readInitialNavigationData({
        us: true,
        query,
        selected,
        loggedIn: Boolean(session?.loggedIn),
      }),
      readHomeFeed({
        us: true,
        offset: 0,
        limit: 50,
        order: typeof query?.order === "string" ? query.order : null,
        direction: typeof query?.direction === "string" ? query.direction : null,
        filter: parseFilter(filterQuery),
        loggedIn: Boolean(session?.loggedIn),
      }),
    ]);
    initialFilterCount = navigationData.initialFilterCount ?? 0;
    initialItems = initialHomeData.items.filter(Boolean) as PreviewIssue[];
    initialHasMore = initialHomeData.hasMore;
    initialNextCursor = initialHomeData.nextCursor;
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    console.warn("us home fallback: database unavailable, rendering empty initial state");
  }

  return (
    <Home
      selected={selected}
      level={level}
      us={true}
      query={query}
      session={session}
      initialFilterCount={initialFilterCount}
      initialItems={initialItems}
      initialHasMore={initialHasMore}
      initialNextCursor={initialNextCursor}
    />
  );
}
