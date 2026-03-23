import type { Metadata } from "next";
import { notFound } from "next/navigation";
import IssueDetailsDE from "@/src/components/details/IssueDetailsDE";
import { readIssueDetails } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
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
  const selectedIssue = selected.issue;
  const initialIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await readIssueDetails({
          us: false,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  const seriesTitle = String(initialIssue?.series?.title || selectedIssue?.series?.title || "");
  const issueNumber = String(initialIssue?.number || selectedIssue?.number || "");

  return createPageMetadata({
    title: seriesTitle && issueNumber ? `${seriesTitle} #${issueNumber}` : "Heftdetails",
    description: seriesTitle && issueNumber
      ? `Details zu ${seriesTitle} #${issueNumber} auf Shortbox.`
      : "Heftdetails auf Shortbox.",
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
