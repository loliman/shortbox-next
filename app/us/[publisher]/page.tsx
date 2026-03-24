import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublisherDetails from "@/src/components/details/PublisherDetails";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readPublisherDetails } from "@/src/lib/read/publisher-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import { buildPublisherBreadcrumbStructuredData } from "@/src/lib/routes/structured-data";
import { createPageMetadata, createRouteMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";
import { generateSeoUrl } from "@/src/util/hierarchy";

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selected = buildSelectedRoot(resolvedParams, true);
  const publisherName = selected.publisher?.name || "";
  const initialData = publisherName
    ? await readPublisherDetails({ us: true, publisher: publisherName })
    : null;
  if (!initialData?.details) {
    return createPageMetadata({ title: "Publisher" });
  }

  const canonicalPublisherName = String(initialData.details.name || publisherName);

  return createRouteMetadata({
    title: `${canonicalPublisherName} | Shortbox`,
    description: `Series and recent issues for ${canonicalPublisherName}.`,
    canonical: canonicalPublisherName
      ? generateSeoUrl({ us: true, publisher: { name: canonicalPublisherName } }, true)
      : undefined,
    searchParams: resolvedSearchParams,
  });
}

export default async function UsPublisherPage({
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
  const selected = buildSelectedRoot(resolvedParams, true);
  const level = buildHierarchyLevel(selected);
  const publisherName = selected.publisher?.name || "";
  const [initialData, navigationData] = await Promise.all([
    publisherName
      ? readPublisherDetails({ us: true, publisher: publisherName })
      : Promise.resolve(null),
    readInitialNavigationData({
      us: true,
      query,
      selected,
      loggedIn: Boolean(session?.loggedIn),
    }),
  ]);
  if (!initialData?.details) notFound();
  const breadcrumbJsonLd = buildPublisherBreadcrumbStructuredData({
    locale: "us",
    publisherName: String(initialData.details.name || publisherName),
  });
  return (
    <>
      <script
        key={`publisher-breadcrumb-jsonld-${String(initialData.details.name || publisherName)}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PublisherDetails
        selected={selected as any}
        level={level}
        us={true}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
      />
    </>
  );
}
