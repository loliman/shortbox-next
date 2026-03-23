import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import PublisherCreate from "@/src/components/restricted/create/PublisherCreate";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";

export default async function PublisherCreatePage() {
  const page = await resolveWorkspacePage({ us: false, session: "write" });

  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      session={page.session}
    >
      <PublisherCreate selected={page.selected} level={page.level} us={page.us} session={page.session} />
    </WorkspacePageShell>
  );
}
