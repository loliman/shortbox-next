import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CatalogPageShell from "@/src/components/app-shell/CatalogPageShell";
import SeriesDetails from "@/src/components/details/SeriesDetails";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readSeriesDetails } from "@/src/lib/read/series-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { createPageMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<Record<string, string>>;
}>): Promise<Metadata> {
  const resolvedParams = await params;
  const selected = buildSelectedRoot(resolvedParams, true);
  const selectedSeries = selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await readSeriesDetails({
          us: true,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
        })
      : null;
  const details = initialData?.details;
  const title = details
    ? `${String(details.title || selectedSeries?.title || "")} ${Number(details.volume || selectedSeries?.volume || 0)}`
    : "Series";

  return createPageMetadata({
    title,
    description: details
      ? `Details and issues for ${String(details.title || "")} volume ${Number(details.volume || 0)}.`
      : "Series details on Shortbox.",
  });
}

export default async function UsSeriesPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    readServerSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, true);
  const level = buildHierarchyLevel(selected);
  const selectedSeries = selected.series;
  const [initialData, navigationData] = await Promise.all([
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? readSeriesDetails({
          us: true,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
        })
      : Promise.resolve(null),
    readInitialNavigationData({
      us: true,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialData?.details) notFound();
  return (
    <CatalogPageShell
      selected={selected}
      level={level}
      us={true}
      query={query}
      session={session}
      initialFilterCount={navigationData.initialFilterCount}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
    >
      <SeriesDetails
        selected={selected as any}
        level={level}
        us={true}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
        initialPublisherNodes={navigationData.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
      />
    </CatalogPageShell>
  );
}
