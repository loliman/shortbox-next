import type { Metadata } from "next";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import FilterPage from "@/src/components/filter/FilterPage";
import { resolveAppPage } from "@/src/lib/routes/app-page";
import { createStaticMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createStaticMetadata(
  "US-Filter",
  "Filter für US-Marvel-Ausgaben in Shortbox."
);

export default async function UsFilterPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const page = await resolveAppPage({ us: true, searchParams, session: "optional" });
  return (
    <AppPageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
      initialFilterCount={page.navigationData?.initialFilterCount}
      initialPublisherNodes={page.navigationData?.initialPublisherNodes}
    >
      <FilterPage
        selected={page.selected}
        us={page.us}
        query={page.query as { filter?: string } | null}
        hasSession={Boolean(page.session?.loggedIn)}
      />
    </AppPageShell>
  );
}
