import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import SeriesCreate from "@/src/components/restricted/create/SeriesCreate";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";

export const dynamic = "force-dynamic";

export default async function SeriesCreatePage() {
  const page = await resolveWorkspacePage({ us: false, session: "write" });

  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      session={page.session}
    >
      <SeriesCreate selected={page.selected} level={page.level} us={page.us} session={page.session} />
    </WorkspacePageShell>
  );
}
