import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeriesDetails from "@/src/components/details/SeriesDetails";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readSeriesDetails } from "@/src/lib/read/series-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { buildSeriesBreadcrumbStructuredData } from "@/src/lib/routes/structured-data";
import { createRouteMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";
import { generateSeoUrl } from "@/src/util/hierarchy";

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selected = buildSelectedRoot(resolvedParams, false);
  const selectedSeries = selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await readSeriesDetails({
          us: false,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
          startyear: Number(selectedSeries.startyear || 0) || undefined,
        })
      : null;
  const details = initialData?.details;
  const canonicalPublisherName = String(
    (details?.publisher as Record<string, unknown> | undefined)?.name || selectedSeries?.publisher?.name || ""
  );
  const canonicalSeriesTitle = String(details?.title || selectedSeries?.title || "");
  const canonicalSeriesVolume = Number(details?.volume || selectedSeries?.volume || 0) || undefined;
  const canonicalSeriesYear = Number(details?.startyear || 0) || undefined;
  const title = details
    ? `${String(details.title || selectedSeries?.title || "")} ${Number(details.volume || selectedSeries?.volume || 0)} | Shortbox`
    : "Serie | Shortbox";

  return createRouteMetadata({
    title,
    description: details
      ? `Details und Ausgaben zur Serie ${String(details.title || "")} Band ${Number(details.volume || 0)}.`
      : "Seriendetails auf Shortbox.",
    canonical:
      canonicalPublisherName && canonicalSeriesTitle
        ? generateSeoUrl(
            {
              us: false,
              series: {
                title: canonicalSeriesTitle,
                startyear: canonicalSeriesYear,
                volume: canonicalSeriesVolume,
                publisher: { name: canonicalPublisherName },
              },
            },
            false
          )
        : undefined,
    searchParams: resolvedSearchParams,
  });
}

export default async function DeSeriesPage({
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
  const selected = buildSelectedRoot(resolvedParams, false);
  const level = buildHierarchyLevel(selected);
  const selectedSeries = selected.series;
  const [initialData, navigationData] = await Promise.all([
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? readSeriesDetails({
          us: false,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
          startyear: Number(selectedSeries.startyear || 0) || undefined,
        })
      : Promise.resolve(null),
    readInitialNavigationData({
      us: false,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialData?.details) notFound();
  const details = initialData.details as Record<string, unknown>;
  const breadcrumbJsonLd = buildSeriesBreadcrumbStructuredData({
    locale: "de",
    publisherName: String((details.publisher as Record<string, unknown> | undefined)?.name || selectedSeries?.publisher?.name || ""),
    seriesTitle: String(details.title || selectedSeries?.title || ""),
    seriesYear: details.startyear as string | number | null | undefined,
    seriesVolume: details.volume as string | number | null | undefined,
  });
  return (
    <>
      <script
        key={`series-breadcrumb-jsonld-${String(details.title || selectedSeries?.title || "series")}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SeriesDetails
        selected={selected as any}
        level={level}
        us={false}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
      />
    </>
  );
}
