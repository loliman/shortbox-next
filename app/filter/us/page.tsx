import type { Metadata } from "next";
import WorkspacePageShell from "@/src/components/app-shell/WorkspacePageShell";
import FilterPage from "@/src/components/filter/FilterPage";
import { resolveWorkspacePage } from "@/src/lib/routes/app-page";
import { createStaticMetadata } from "@/src/lib/routes/metadata";

export const metadata: Metadata = createStaticMetadata(
  "US-Filter",
  "Filter für US-Marvel-Ausgaben in Shortbox.",
  { noIndex: true, canonical: "/filter/us" }
);

export default async function UsFilterPage({
  searchParams,
}: Readonly<{
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const page = await resolveWorkspacePage({ us: true, searchParams, session: "optional" });
  return (
    <WorkspacePageShell
      selected={page.selected}
      level={page.level}
      us={page.us}
      query={page.query}
      session={page.session}
    >
      <FilterPage
        selected={page.selected}
        us={page.us}
        query={page.query as { filter?: string } | null}
        hasSession={Boolean(page.session?.loggedIn)}
      />
    </WorkspacePageShell>
  );
}
