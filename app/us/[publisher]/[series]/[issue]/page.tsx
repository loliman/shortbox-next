import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IssueDetailsUS from "@/src/components/details/IssueDetailsUS";
import { readIssueDetails } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { buildIssueMetadataParts } from "@/src/lib/routes/issue-metadata";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { createRouteMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";

/**
 * Issue detail page for US locale
 * Supports both legacy URL format and new SEO-friendly format:
 * - Legacy: /us/[publisher]/[series]/[issue]/[variant]
 * - SEO: /us/[publisher]/[series]/[issue]/[format]/[variant]
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
  const selected = buildSelectedRoot(resolvedParams, true);
  const selectedIssue = selected.issue;
  const initialIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await readIssueDetails({
          us: true,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
            startyear: Number(selectedIssue.series.startyear || 0) || undefined,
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  const metadataParts = buildIssueMetadataParts(initialIssue || selectedIssue, "us");

  return createRouteMetadata({
    title: metadataParts.title,
    description: metadataParts.description,
    canonical: metadataParts.canonical,
    searchParams: resolvedSearchParams,
  });
}

export default async function UsIssuePage({
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
  const selectedIssue = selected.issue;
  const [initialIssue, navigationData] = await Promise.all([
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? readIssueDetails({
          us: true,
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
      us: true,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialIssue) notFound();
  return (
    <IssueDetailsUS
      selected={selected}
      level={level}
      us={true}
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


