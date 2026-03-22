import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import IssueDetailsUS from "@/src/components/details/IssueDetailsUS";
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
  const selected = buildSelectedRoot(resolvedParams, true);
  const selectedIssue = selected.issue;
  const initialIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await readIssueDetails({
          us: true,
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
  const variantText = String(initialIssue?.variant || selectedIssue?.variant || "").trim();

  return createPageMetadata({
    title:
      seriesTitle && issueNumber
        ? `${seriesTitle} #${issueNumber}${variantText ? ` (${variantText})` : ""}`
        : "Variant Details",
    description:
      seriesTitle && issueNumber
        ? `Details for ${seriesTitle} #${issueNumber}${variantText ? ` (${variantText})` : ""} on Shortbox.`
        : "Variant details on Shortbox.",
  });
}

export default async function UsIssueVariantPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, true);
  const level = buildHierarchyLevel(selected);
  const session = await readServerSession();
  const selectedIssue = selected.issue;
  const initialIssue =
    selectedIssue?.series?.publisher?.name && selectedIssue?.series?.title && selectedIssue?.number
      ? await readIssueDetails({
          us: true,
          publisher: selectedIssue.series.publisher.name,
          series: selectedIssue.series.title,
          volume: Number(selectedIssue.series.volume || 0),
          number: selectedIssue.number,
          format: selectedIssue.format || undefined,
          variant: selectedIssue.variant || undefined,
        })
      : null;
  if (!initialIssue) notFound();
  const navigationData = await readInitialNavigationData({
    us: true,
    query,
    selected,
    loggedIn: Boolean(session?.loggedIn),
  });
  return (
    <AppPageShell
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
      <IssueDetailsUS
        selected={selected}
        level={level}
        us={true}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialIssue={initialIssue}
        initialPublisherNodes={navigationData.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
        initialIssueNodesBySeriesKey={navigationData.initialIssueNodesBySeriesKey}
      />
    </AppPageShell>
  );
}
