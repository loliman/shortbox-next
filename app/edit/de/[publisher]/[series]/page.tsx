import { notFound } from "next/navigation";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import SeriesEdit from "@/src/components/restricted/edit/SeriesEdit";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readSeriesEditData } from "@/src/lib/read/series-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { requirePageWriteSession } from "@/src/lib/server/guards";

export default async function DeSeriesEditPage({
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
  const series = selected.series;
  const [navigationData, initialSeries] = await Promise.all([
    readInitialNavigationData({
      us: false,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
    readSeriesEditData({
      us: false,
      publisher: series?.publisher?.name ?? "",
      series: series?.title ?? "",
      volume: Number(series?.volume || 0),
    }),
  ]);
  if (!initialSeries) notFound();

  return (
    <WorkspacePageShell
      selected={selected}
      level={level}
      us={false}
      query={query}
      session={session}
    >
      <SeriesEdit
        selected={selected}
        level={level}
        us={false}
        query={query}
        initialFilterCount={navigationData.initialFilterCount}
        initialSeries={initialSeries}
        initialPublisherNodes={navigationData.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
        session={session}
      />
    </WorkspacePageShell>
  );
}
