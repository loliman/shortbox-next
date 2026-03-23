import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { requirePageWriteSession } from "@/src/lib/server/guards";

export default async function UsIssueCreateSeriesPage({
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

  return (
    <WorkspacePageShell
      selected={selected}
      level={level}
      us={true}
      query={query}
      session={session}
    >
      <IssueCreate
        selected={selected}
        level={level}
        us={true}
        query={query}
        session={session}
      />
    </WorkspacePageShell>
  );
}
