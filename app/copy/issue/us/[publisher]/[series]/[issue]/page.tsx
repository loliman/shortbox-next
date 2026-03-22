import { notFound } from "next/navigation";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import IssueCopy from "@/src/components/restricted/copy/IssueCopy";
import { readIssueDetails } from "@/src/lib/read/issue-read";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { requirePageWriteSession } from "@/src/lib/server/guards";

export default async function UsIssueCopyPage({
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
  const session = await requirePageWriteSession();
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
      <IssueCopy
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
    </AppPageShell>
  );
}
