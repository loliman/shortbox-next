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
  const selected = buildSelectedRoot(resolvedParams, false);
  const selectedSeries = selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await readSeriesDetails({
          us: false,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
        })
      : null;
  const details = initialData?.details;
  const title = details
    ? `${String(details.title || selectedSeries?.title || "")} ${Number(details.volume || selectedSeries?.volume || 0)}`
    : "Serie";

  return createPageMetadata({
    title,
    description: details
      ? `Details und Ausgaben zur Serie ${String(details.title || "")} Band ${Number(details.volume || 0)}.`
      : "Seriendetails auf Shortbox.",
  });
}

export default async function DeSeriesPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, false);
  const level = buildHierarchyLevel(selected);
  const session = await readServerSession();
  const selectedSeries = selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await readSeriesDetails({
          us: false,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
        })
      : null;
  if (!initialData?.details) notFound();
  const navigationData = await readInitialNavigationData({
    us: false,
    query,
    selected,
    loggedIn: Boolean(session?.loggedIn),
  });
  return (
    <CatalogPageShell
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
      <SeriesDetails
        selected={selected as any}
        level={level}
        us={false}
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
