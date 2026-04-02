import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublisherDetails from "@/src/components/details/PublisherDetails";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readPublisherDetails } from "@/src/lib/read/publisher-read";
import { buildHierarchyLevel, buildSelectedRoot, normalizePageQuery } from "@/src/lib/routes/page-state";
import {
  buildPublisherBreadcrumbStructuredData,
  buildPublisherCollectionPageStructuredData,
} from "@/src/lib/routes/structured-data";
import { createPageMetadata, createRouteMetadata } from "@/src/lib/routes/metadata";
import { readServerSession } from "@/src/lib/server/session";
import { generateSeoUrl } from "@/src/lib/routes/hierarchy";

export async function generateMetadata({
  params,
  searchParams,
}: Readonly<{
  params: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined> | undefined>;
}>): Promise<Metadata> {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const selected = buildSelectedRoot(resolvedParams, false);
  const publisherName = selected.publisher?.name || "";
  const initialData = publisherName
    ? await readPublisherDetails({ us: false, publisher: publisherName })
    : null;
  if (!initialData?.details) {
    return createPageMetadata({ title: "Verlag" });
  }

  const canonicalPublisherName = String(initialData.details.name || publisherName);

  return createRouteMetadata({
    title: canonicalPublisherName,
    description: `${canonicalPublisherName}: Serien, Ausgaben und Aktualisierungen in Shortbox mit direkten Links zu Heften und Detailseiten.`,
    canonical: canonicalPublisherName
      ? generateSeoUrl({ us: false, publisher: { name: canonicalPublisherName } }, false)
      : undefined,
    searchParams: resolvedSearchParams,
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
  const resolvedPublisherName = String(initialData.details.name || publisherName);
  const breadcrumbJsonLd = buildPublisherBreadcrumbStructuredData({
    locale: "de",
    publisherName: resolvedPublisherName,
  });
  const collectionPageJsonLd = buildPublisherCollectionPageStructuredData({
    locale: "de",
    publisherName: resolvedPublisherName,
    description: `${resolvedPublisherName}: Serien, Ausgaben und Aktualisierungen in Shortbox mit direkten Links zu Heften und Detailseiten.`,
  });
  return (
    <>
      <script
        key={`publisher-breadcrumb-jsonld-${resolvedPublisherName}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        key={`publisher-collectionpage-jsonld-${resolvedPublisherName}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }}
      />
      <PublisherDetails
        selected={selected}
        level={level}
        us={false}
        query={query}
        session={session}
        initialFilterCount={navigationData.initialFilterCount}
        initialData={initialData}
      />
    </>
  );
}
