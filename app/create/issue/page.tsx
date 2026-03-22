import AppPageShell from "@/src/components/app-shell/AppPageShell";
import IssueCreate from "@/src/components/restricted/create/IssueCreate";
import { resolveAppPage } from "@/src/lib/routes/app-page";

export default async function IssueCreatePage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const page = await resolveAppPage({ us: false, searchParams, includeNavigation: false, session: "write" });

  return (
    <AppPageShell selected={page.selected} level={page.level} us={page.us} query={page.query} session={page.session}>
      <IssueCreate
        selected={page.selected}
        level={page.level}
        us={page.us}
        session={page.session}
        query={page.query}
      />
    </AppPageShell>
  );
}
