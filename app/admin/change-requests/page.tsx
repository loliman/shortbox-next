import AppPageShell from "@/src/components/app-shell/AppPageShell";
import ChangeRequests from "@/src/components/admin/ChangeRequests";
import { countChangeRequests, readChangeRequests } from "@/src/lib/read/issue-read";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export default async function ChangeRequestsPage() {
  const page = await resolveAppPage({ us: false, session: "admin" });
  const initialItems = await readChangeRequests({
    order: "createdAt",
    direction: "asc",
  });
  const changeRequestsCount = await countChangeRequests().catch(() => 0);

  return (
    <AppPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
      initialFilterCount={page.navigationData?.initialFilterCount}
      initialPublisherNodes={page.navigationData?.initialPublisherNodes}
      changeRequestsCount={changeRequestsCount}
    >
      <ChangeRequests
        selected={page.selected}
        level={page.level}
        us={page.us}
        session={page.session}
        query={page.query}
        initialFilterCount={page.navigationData?.initialFilterCount}
        initialItems={initialItems}
        initialPublisherNodes={page.navigationData?.initialPublisherNodes}
        changeRequestsCount={changeRequestsCount}
      />
    </AppPageShell>
  );
}
