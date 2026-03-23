import { notFound } from "next/navigation";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import PublisherEdit from "@/src/components/restricted/edit/PublisherEdit";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readPublisherEditData } from "@/src/lib/read/publisher-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { requirePageWriteSession } from "@/src/lib/server/guards";

export default async function DePublisherEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    requirePageWriteSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, false);
  const level = buildHierarchyLevel(selected);
  const [navigationData, initialPublisher] = await Promise.all([
    readInitialNavigationData({
      us: false,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
    readPublisherEditData({
      us: false,
      publisher: String(selected.publisher?.name || ""),
    }),
  ]);
  if (!initialPublisher) notFound();

  return (
    <WorkspacePageShell
      selected={selected}
      level={level}
      us={false}
      query={query}
      session={session}
    >
      <PublisherEdit
        selected={selected}
        level={level}
        us={false}
        query={query}
        initialFilterCount={navigationData.initialFilterCount}
        initialPublisher={initialPublisher}
        initialPublisherNodes={navigationData.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
        session={session}
      />
    </WorkspacePageShell>
  );
}
