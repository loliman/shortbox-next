import AppPageShell from "@/src/components/app-shell/AppPageShell";
import SeriesCreate from "@/src/components/restricted/create/SeriesCreate";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export default async function SeriesCreatePage() {
  const page = await resolveAppPage({ us: false, includeNavigation: false, session: "write" });

  return (
    <AppPageShell selected={page.selected} level={page.level} us={page.us} session={page.session}>
      <SeriesCreate selected={page.selected} level={page.level} us={page.us} session={page.session} />
    </AppPageShell>
  );
}
