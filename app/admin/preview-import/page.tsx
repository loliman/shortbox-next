import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import PreviewImport from "@/src/components/admin/PreviewImport";
import { countChangeRequests } from "@/src/lib/read/issue-read";
import { readPreviewImportQueue } from "@/src/lib/read/preview-import-read";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";
import { requirePageAdminSession } from "@/src/lib/server/guards";

export default async function PreviewImportPage() {
  const [session, page, queue, changeRequestsCount] = await Promise.all([
    requirePageAdminSession(),
    resolveWorkspacePage({ us: false, session: "admin" }),
    readPreviewImportQueue(),
    countChangeRequests().catch(() => 0),
  ]);

  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={session}
      changeRequestsCount={changeRequestsCount}
    >
      <PreviewImport initialQueue={queue} session={session} />
    </WorkspacePageShell>
  );
}
