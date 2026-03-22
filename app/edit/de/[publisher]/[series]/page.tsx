import { notFound } from "next/navigation";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
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
  const resolvedParams = await params;
  const query = normalizePageQuery(await searchParams);
  const selected = buildSelectedRoot(resolvedParams, false);
  const level = buildHierarchyLevel(selected);
  const series = selected.series;
  const session = await requirePageWriteSession();
  const navigationData = await readInitialNavigationData({
    us: false,
    query,
    selected,
    loggedIn: Boolean(session?.loggedIn),
  });
  const initialSeries = await readSeriesEditData({
    us: false,
    publisher: String(series?.publisher?.name || ""),
    series: String(series?.title || ""),
    volume: Number(series?.volume || 0),
  });
  if (!initialSeries) notFound();

  return (
    <AppPageShell
      selected={selected}
      level={level}
      us={false}
      query={query}
      session={session}
      initialFilterCount={navigationData.initialFilterCount}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
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
    </AppPageShell>
  );
}
