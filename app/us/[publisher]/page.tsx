import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppPageShell from "@/src/components/app-shell/AppPageShell";
import PublisherDetails from "@/src/components/details/PublisherDetails";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readPublisherDetails } from "@/src/lib/read/publisher-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { createPageMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<Record<string, string>>;
}>): Promise<Metadata> {
  const resolvedParams = await params;
  const selected = buildSelectedRoot(resolvedParams, true);
  const publisherName = selected.publisher?.name || "";
  const initialData = publisherName
    ? await readPublisherDetails({ us: true, publisher: publisherName })
    : null;
  if (!initialData?.details) {
    return createPageMetadata({ title: "Publisher" });
  }

  return createPageMetadata({
    title: String(initialData.details.name || publisherName),
    description: `Series and recent issues for ${String(initialData.details.name || publisherName)}.`,
  });
}

export default async function UsPublisherPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, true);
  const level = buildHierarchyLevel(selected);
  const session = await readServerSession();
  const publisherName = selected.publisher?.name || "";
  const initialData = publisherName
    ? await readPublisherDetails({ us: true, publisher: publisherName })
    : null;
  if (!initialData?.details) notFound();
  const navigationData = await readInitialNavigationData({
    us: true,
    query,
    selected,
    loggedIn: Boolean(session?.loggedIn),
  });
  return (
    <AppPageShell
      selected={selected}
      level={level}
      us={true}
      query={query}
      session={session}
      initialFilterCount={navigationData.initialFilterCount}
      initialPublisherNodes={navigationData.initialPublisherNodes}
      initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
    >
      <PublisherDetails
        selected={selected as any}
        level={level}
        us={true}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
        initialPublisherNodes={navigationData.initialPublisherNodes}
        initialSeriesNodesByPublisher={navigationData.initialSeriesNodesByPublisher}
      />
    </AppPageShell>
  );
}
