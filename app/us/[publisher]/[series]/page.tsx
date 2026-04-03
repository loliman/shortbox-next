import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeriesDetails from "@/src/components/details/SeriesDetails";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readSeriesDetails } from "@/src/lib/read/series-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { buildSeriesBreadcrumbStructuredData, buildSeriesCollectionPageStructuredData } from "@/src/lib/routes/structured-data";
import { createRouteMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";
import { generateSeoUrl } from "@/src/lib/routes/hierarchy";

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selected = buildSelectedRoot(resolvedParams, true);
  const selectedSeries = selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await readSeriesDetails({
          us: true,
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
    ? `${String(details.title || selectedSeries?.title || "")} ${Number(details.volume || selectedSeries?.volume || 0)}`
    : "Serie";

  return createRouteMetadata({
    title,
    description: details
      ? `${String(details.title || "")} Band ${Number(details.volume || 0)}: Ausgaben, Varianten und Seriendetails in Shortbox mit Verlag, Jahrgang und Heftuebersicht.`
      : "Seriendetails auf Shortbox.",
    canonical:
      canonicalPublisherName && canonicalSeriesTitle
        ? generateSeoUrl(
            {
              us: true,
              series: {
                title: canonicalSeriesTitle,
                startyear: canonicalSeriesYear,
                volume: canonicalSeriesVolume,
                publisher: { name: canonicalPublisherName },
              },
            },
            true
          )
        : undefined,
    searchParams: resolvedSearchParams,
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
          startyear: Number(selectedSeries.startyear || 0) || undefined,
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
  const details = initialData.details as Record<string, unknown>;
  const resolvedPublisherName = String(
    (details.publisher as Record<string, unknown> | undefined)?.name ??
      selectedSeries?.publisher?.name ??
      ""
  );
  const resolvedSeriesTitle = String(details.title ?? selectedSeries?.title ?? "");
  const resolvedSeriesYear = details.startyear as string | number | null | undefined;
  const resolvedSeriesVolume = details.volume as string | number | null | undefined;
  const breadcrumbJsonLd = buildSeriesBreadcrumbStructuredData({
    locale: "us",
    publisherName: resolvedPublisherName,
    seriesTitle: resolvedSeriesTitle,
    seriesYear: resolvedSeriesYear,
    seriesVolume: resolvedSeriesVolume,
  });
  const collectionPageJsonLd = buildSeriesCollectionPageStructuredData({
    locale: "us",
    publisherName: resolvedPublisherName,
    seriesTitle: resolvedSeriesTitle,
    seriesYear: resolvedSeriesYear,
    seriesVolume: resolvedSeriesVolume,
    description: `${resolvedSeriesTitle} Band ${Number(resolvedSeriesVolume || 0)}: Ausgaben, Varianten und Seriendetails in Shortbox mit Verlag, Jahrgang und Heftuebersicht.`,
  });
  return (
    <>
      <script
        key={`series-breadcrumb-jsonld-${resolvedSeriesTitle}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        key={`series-collectionpage-jsonld-${resolvedSeriesTitle}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      <SeriesDetails
        selected={selected}
        level={level}
        us={true}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
      />
    </>
  );
}
