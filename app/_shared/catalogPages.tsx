import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublisherDetails from "@/src/components/details/PublisherDetails";
import SeriesDetails from "@/src/components/details/SeriesDetails";
import IssueDetailsDE from "@/src/components/details/IssueDetailsDE";
import IssueDetailsUS from "@/src/components/details/IssueDetailsUS";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import IssueEdit from "@/src/components/restricted/edit/IssueEdit";
import IssueReport from "@/src/components/report/IssueReport";
import { readIssueDetails, readIssueMetadata } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readPublisherDetails } from "@/src/lib/read/publisher-read";
import { readSeriesDetails } from "@/src/lib/read/series-read";
import { buildIssueMetadataParts } from "@/src/lib/routes/issue-metadata";
import { createPageMetadata, createRouteMetadata } from "@/src/lib/routes/metadata";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import {
  buildPublisherBreadcrumbStructuredData,
  buildPublisherCollectionPageStructuredData,
  buildSeriesBreadcrumbStructuredData,
  buildSeriesCollectionPageStructuredData,
} from "@/src/lib/routes/structured-data";
import { generateSeoUrl } from "@/src/lib/routes/hierarchy";
import { readServerSession } from "@/src/lib/server/session";
import { requirePageWriteSession } from "@/src/lib/server/guards";

type AppPageProps = Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>;

type CatalogLocale = "de" | "us";

function readRecordString(
  record: Record<string, unknown> | null | undefined,
  key: string
): string {
  const value = record?.[key];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function buildLocaleContext(us: boolean): { locale: CatalogLocale; fallbackTitle: string } {
  return {
    locale: us ? "us" : "de",
    fallbackTitle: "Verlag",
  };
}

export async function generatePublisherPageMetadata(
  props: AppPageProps,
  us: boolean
): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([props.params, props.searchParams]);
  const selected = buildSelectedRoot(resolvedParams, us);
  const publisherName = selected.publisher?.name || "";
  const initialData = publisherName
    ? await readPublisherDetails({ us, publisher: publisherName })
    : null;

  if (!initialData?.details) {
    return createPageMetadata({ title: buildLocaleContext(us).fallbackTitle });
  }

  const canonicalPublisherName = String(initialData.details.name || publisherName);

  return createRouteMetadata({
    title: canonicalPublisherName,
    description: `${canonicalPublisherName}: Serien, Ausgaben und Aktualisierungen in Shortbox mit direkten Links zu Heften und Detailseiten.`,
    canonical: canonicalPublisherName
      ? generateSeoUrl({ us, publisher: { name: canonicalPublisherName } }, us)
      : undefined,
    searchParams: resolvedSearchParams,
  });
}

export async function renderPublisherPage(props: AppPageProps, us: boolean) {
  const locale = buildLocaleContext(us).locale;
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    props.params,
    props.searchParams,
    readServerSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, us);
  const level = buildHierarchyLevel(selected);
  const publisherName = selected.publisher?.name || "";
  const [initialData, navigationData] = await Promise.all([
    publisherName
      ? readPublisherDetails({ us, publisher: publisherName })
      : Promise.resolve(null),
    readInitialNavigationData({
      us,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialData?.details) notFound();

  const resolvedPublisherName = String(initialData.details.name || publisherName);
  const breadcrumbJsonLd = buildPublisherBreadcrumbStructuredData({
    locale,
    publisherName: resolvedPublisherName,
  });
  const collectionPageJsonLd = buildPublisherCollectionPageStructuredData({
    locale,
    publisherName: resolvedPublisherName,
    description: `${resolvedPublisherName}: Serien, Ausgaben und Aktualisierungen in Shortbox mit direkten Links zu Heften und Detailseiten.`,
  });

  return (
    <>
      <script
        key={`publisher-breadcrumb-jsonld-${resolvedPublisherName}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        key={`publisher-collectionpage-jsonld-${resolvedPublisherName}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      <PublisherDetails
        selected={selected}
        level={level}
        us={us}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
      />
    </>
  );
}

export async function generateSeriesPageMetadata(
  props: AppPageProps,
  us: boolean
): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([props.params, props.searchParams]);
  const selected = buildSelectedRoot(resolvedParams, us);
  const selectedSeries = selected.series;
  const initialData =
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? await readSeriesDetails({
          us,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
          startyear: Number(selectedSeries.startyear || 0) || undefined,
        })
      : null;
  const details = initialData?.details;
  const detailsPublisher = details?.publisher as Record<string, unknown> | undefined;
  const canonicalPublisherName =
    readRecordString(detailsPublisher, "name") || selectedSeries?.publisher?.name || "";
  const canonicalSeriesTitle =
    readRecordString(details as Record<string, unknown> | undefined, "title") || selectedSeries?.title || "";
  const canonicalSeriesVolume = Number(details?.volume || selectedSeries?.volume || 0) || undefined;
  const canonicalSeriesYear = Number(details?.startyear || 0) || undefined;
  const title = details
    ? `${readRecordString(details as Record<string, unknown>, "title") || selectedSeries?.title || ""} ${Number(details.volume || selectedSeries?.volume || 0)}`
    : "Serie";

  return createRouteMetadata({
    title,
    description: details
      ? `${readRecordString(details as Record<string, unknown>, "title")} Band ${Number(details.volume || 0)}: Ausgaben, Varianten und Seriendetails in Shortbox mit Verlag, Jahrgang und Heftuebersicht.`
      : "Seriendetails auf Shortbox.",
    canonical:
      canonicalPublisherName && canonicalSeriesTitle
        ? generateSeoUrl(
            {
              us,
              series: {
                title: canonicalSeriesTitle,
                startyear: canonicalSeriesYear,
                volume: canonicalSeriesVolume,
                publisher: { name: canonicalPublisherName },
              },
            },
            us
          )
        : undefined,
    searchParams: resolvedSearchParams,
  });
}

export async function renderSeriesPage(props: AppPageProps, us: boolean) {
  const locale = buildLocaleContext(us).locale;
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    props.params,
    props.searchParams,
    readServerSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, us);
  const level = buildHierarchyLevel(selected);
  const selectedSeries = selected.series;
  const [initialData, navigationData] = await Promise.all([
    selectedSeries?.publisher?.name && selectedSeries?.title
      ? readSeriesDetails({
          us,
          publisher: selectedSeries.publisher.name,
          series: selectedSeries.title,
          volume: Number(selectedSeries.volume || 0),
          startyear: Number(selectedSeries.startyear || 0) || undefined,
        })
      : Promise.resolve(null),
    readInitialNavigationData({
      us,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialData?.details) notFound();

  const details = initialData.details as Record<string, unknown>;
  const resolvedPublisherName =
    readRecordString(details.publisher as Record<string, unknown> | undefined, "name") ||
    selectedSeries?.publisher?.name ||
    "";
  const resolvedSeriesTitle = readRecordString(details, "title") || selectedSeries?.title || "";
  const resolvedSeriesYear = details.startyear as string | number | null | undefined;
  const resolvedSeriesVolume = details.volume as string | number | null | undefined;
  const breadcrumbJsonLd = buildSeriesBreadcrumbStructuredData({
    locale,
    publisherName: resolvedPublisherName,
    seriesTitle: resolvedSeriesTitle,
    seriesYear: resolvedSeriesYear,
    seriesVolume: resolvedSeriesVolume,
  });
  const collectionPageJsonLd = buildSeriesCollectionPageStructuredData({
    locale,
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
        us={us}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
      />
    </>
  );
}

export async function generateIssuePageMetadata(
  props: AppPageProps,
  us: boolean
): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([props.params, props.searchParams]);
  const selected = buildSelectedRoot(resolvedParams, us);
  const selectedIssue = selected.issue;
  const metadataIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await readIssueMetadata({
          us,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          startyear: Number(selectedIssue.series.startyear || 0) || undefined,
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  const metadataParts = buildIssueMetadataParts(metadataIssue || selectedIssue, us ? "us" : "de");

  return createRouteMetadata({
    title: metadataParts.title,
    description: metadataParts.description,
    canonical: metadataParts.canonical,
    searchParams: resolvedSearchParams,
  });
}

export async function renderIssuePage(props: AppPageProps, us: boolean) {
  const IssueDetails = us ? IssueDetailsUS : IssueDetailsDE;
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    props.params,
    props.searchParams,
    readServerSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, us);
  const level = buildHierarchyLevel(selected);
  const selectedIssue = selected.issue;
  const [initialIssue, navigationData] = await Promise.all([
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? readIssueDetails({
          us,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          startyear: Number(selectedIssue.series.startyear || 0) || undefined,
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : Promise.resolve(null),
    readInitialNavigationData({
      us,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialIssue) notFound();

  return (
    <IssueDetails
      selected={selected}
      level={level}
      us={us}
      query={query}
      session={session}
      initialFilterCount={navigationData.initialFilterCount}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
      initialIssue={initialIssue}
    />
  );
}

type IssueWorkspaceContent = typeof IssueEdit | typeof IssueReport;

async function renderIssueWorkspacePage(
  props: AppPageProps,
  us: boolean,
  Content: IssueWorkspaceContent,
  readSession: typeof readServerSession | typeof requirePageWriteSession
) {
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    props.params,
    props.searchParams,
    readSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, us);
  const level = buildHierarchyLevel(selected);
  const issue = selected.issue;
  const [navigationData, initialIssue] = await Promise.all([
    readInitialNavigationData({
      us,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
    readIssueDetails({
      us,
      publisher: issue?.series?.publisher?.name ?? "",
      series: issue?.series?.title ?? "",
      volume: Number(issue?.series?.volume || 0),
      number: issue?.number ?? "",
      format: issue?.format || undefined,
      variant: issue?.variant || undefined,
    }),
  ]);
  if (!initialIssue) notFound();

  return (
    <WorkspacePageShell
      selected={selected}
      level={level}
      us={us}
      query={query}
      session={session}
    >
      <Content
        selected={selected}
        level={level}
        us={us}
        query={query}
        initialFilterCount={navigationData.initialFilterCount}
        initialIssue={initialIssue}
        initialPublisherNodes={navigationData.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
        session={session}
      />
    </WorkspacePageShell>
  );
}

export function renderIssueEditPage(props: AppPageProps, us: boolean) {
  return renderIssueWorkspacePage(props, us, IssueEdit, requirePageWriteSession);
}

export function renderIssueReportPage(props: AppPageProps, us: boolean) {
  return renderIssueWorkspacePage(props, us, IssueReport, readServerSession);
}

export async function renderIssueCreatePage(props: AppPageProps, us: boolean) {
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    props.params,
    props.searchParams,
    requirePageWriteSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, us);
  const level = buildHierarchyLevel(selected);

  return (
    <WorkspacePageShell
      selected={selected}
      level={level}
      us={us}
      query={query}
      session={session}
    >
      <IssueCreate
        selected={selected}
        level={level}
        us={us}
        query={query}
        session={session}
      />
    </WorkspacePageShell>
  );
}
