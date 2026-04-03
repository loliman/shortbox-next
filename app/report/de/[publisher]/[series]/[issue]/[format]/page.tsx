import { notFound } from "next/navigation";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import IssueReport from "@/src/components/report/IssueReport";
import { readIssueDetails } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { readServerSession } from "@/src/lib/server/session";

export default async function DeIssueReportVariantPage({
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
  const issue = selected.issue;
  const [navigationData, initialIssue] = await Promise.all([
    readInitialNavigationData({
      us: false,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
    readIssueDetails({
      us: false,
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
      us={false}
      query={query}
      session={session}
    >
      <IssueReport
        selected={selected}
        level={level}
        us={false}
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
