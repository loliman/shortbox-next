import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IssueDetailsDE from "@/src/components/details/IssueDetailsDE";
import { readIssueDetails, readIssueMetadata } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { buildIssueMetadataParts } from "@/src/lib/routes/issue-metadata";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { createRouteMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";

/**
 * Issue detail page for German locale
 * Supports both legacy URL format and new SEO-friendly format:
 * - Legacy: /de/[publisher]/[series]/[issue]/[variant]
 * - SEO: /de/[publisher]/[series]/[issue]/[format]/[variant]
 *
 * The route parameters are intelligently parsed by buildSelectedRoot() which detects the format.
 */

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selected = buildSelectedRoot(resolvedParams, false);
  const selectedIssue = selected.issue;
  const metadataIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await readIssueMetadata({
          us: false,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          startyear: Number(selectedIssue.series.startyear || 0) || undefined,
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  const metadataParts = buildIssueMetadataParts(metadataIssue || selectedIssue, "de");

  return createRouteMetadata({
    title: metadataParts.title,
    description: metadataParts.description,
    canonical: metadataParts.canonical,
    searchParams: resolvedSearchParams,
  });
}

export default async function DeIssuePage({
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
  const selectedIssue = selected.issue;
  const [initialIssue, navigationData] = await Promise.all([
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? readIssueDetails({
          us: false,
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
      us: false,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialIssue) notFound();
  return (
    <IssueDetailsDE
      selected={selected}
      level={level}
      us={false}
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

