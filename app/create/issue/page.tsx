import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";

export const dynamic = "force-dynamic";

export default async function IssueCreatePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const page = await resolveWorkspacePage({ us: false, searchParams, session: "write" });

  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
    >
      <IssueCreate
        selected={page.selected}
        level={page.level}
        us={page.us}
        session={page.session}
        query={page.query}
      />
    </WorkspacePageShell>
  );
}
