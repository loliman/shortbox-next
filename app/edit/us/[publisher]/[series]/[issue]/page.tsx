import { notFound } from "next/navigation";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import IssueEdit from "@/src/components/restricted/edit/IssueEdit";
import { readIssueDetails } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { requirePageWriteSession } from "@/src/lib/server/guards";

export default async function UsIssueEditPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    requirePageWriteSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, true);
  const level = buildHierarchyLevel(selected);
  const issue = selected.issue;
  const [navigationData, initialIssue] = await Promise.all([
    readInitialNavigationData({
      us: true,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
    readIssueDetails({
      us: true,
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
      us={true}
      query={query}
      session={session}
    >
      <IssueEdit
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
