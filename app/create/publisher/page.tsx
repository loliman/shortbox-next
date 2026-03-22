import AppPageShell from "@/src/components/app-shell/AppPageShell";
import PublisherCreate from "@/src/components/restricted/create/PublisherCreate";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export default async function PublisherCreatePage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false, session: "write" });

  return (
    <AppPageShell selected={page.selected} level={page.level} us={page.us} session={page.session}>
      <PublisherCreate selected={page.selected} level={page.level} us={page.us} session={page.session} />
    </AppPageShell>
  );
}
