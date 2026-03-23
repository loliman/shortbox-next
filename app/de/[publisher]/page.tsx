import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  const selected = buildSelectedRoot(resolvedParams, false);
  const publisherName = selected.publisher?.name || "";
  const initialData = publisherName
    ? await readPublisherDetails({ us: false, publisher: publisherName })
    : null;
  if (!initialData?.details) {
    return createPageMetadata({ title: "Verlag" });
  }

  return createPageMetadata({
    title: String(initialData.details.name || publisherName),
    description: `Alle Serien und aktualisierten Ausgaben zu ${String(initialData.details.name || publisherName)}.`,
  });
}

export default async function DePublisherPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>) {
  const [resolvedParams, resolvedSearchParams, session] = await Promise.all([
    params,
    searchParams,
    readServerSession(),
  ]);
  const query = normalizePageQuery(resolvedSearchParams);
  const selected = buildSelectedRoot(resolvedParams, false);
  const level = buildHierarchyLevel(selected);
  const publisherName = selected.publisher?.name || "";
  const [initialData, navigationData] = await Promise.all([
    publisherName
      ? readPublisherDetails({ us: false, publisher: publisherName })
      : Promise.resolve(null),
    readInitialNavigationData({
      us: false,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialData?.details) notFound();
  return (
    <PublisherDetails
      selected={selected as any}
      level={level}
      us={false}
      query={query}
      session={session}
      initialFilterCount={navigationData.initialFilterCount}
      initialData={initialData}
    />
  );
}
