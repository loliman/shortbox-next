import { notFound } from "next/navigation";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import IssueReport from "@/src/components/report/IssueReport";
import { readIssueDetails } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { readServerSession } from "@/src/lib/server/session";

export default async function UsIssueReportPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const resolvedParams = await params;
  const query = normalizePageQuery(await searchParams);
  const selected = buildSelectedRoot(resolvedParams, true);
  const level = buildHierarchyLevel(selected);
  const issue = selected.issue;
  const session = await readServerSession();
  const navigationData = await readInitialNavigationData({
    us: true,
    query,
    selected,
    loggedIn: Boolean(session?.loggedIn),
  });
  const initialIssue = await readIssueDetails({
    us: true,
    publisher: String(issue?.series?.publisher?.name || ""),
    series: String(issue?.series?.title || ""),
    volume: Number(issue?.series?.volume || 0),
    number: String(issue?.number || ""),
    format: issue?.format || undefined,
    variant: issue?.variant || undefined,
  });
  if (!initialIssue) notFound();

  return (
    <WorkspacePageShell
      selected={selected}
      level={level}
      us={true}
      query={query}
      session={session}
    >
      <IssueReport
        selected={selected}
        level={level}
        us={true}
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
