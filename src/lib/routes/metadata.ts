import "server-only";

import type { Metadata } from "next";
import { normalizePageQuery } from "./page-state";

const DEFAULT_DESCRIPTION =
  "Shortbox listet deutsche und US-Marvel-Veröffentlichungen serverseitig und detailreich auf.";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shortbox.de";
const TRACKING_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  "gclid",
  "fbclid",
  "msclkid",
  "dclid",
  "twclid",
  "ttclid",
  "mc_cid",
  "mc_eid",
]);
const SEARCH_QUERY_KEYS = new Set(["q", "query", "search", "pattern", "term"]);

type MetadataSearchParamsInput = Record<string, string | string[] | undefined> | null | undefined;

type RouteQueryMode = "clean" | "tracking" | "variant" | "search";

function normalizeMetadataTitle(title: string): string {
  return title.replace(/\s*\|\s*shortbox\s*$/i, "").trim();
}

function buildRobots(index: boolean, follow: boolean): NonNullable<Metadata["robots"]> {
  return {
    index,
    follow,
    googleBot: {
      index,
      follow,
    },
  };
}

function getRouteQueryMode(searchParams: MetadataSearchParamsInput): RouteQueryMode {
  const query = normalizePageQuery(searchParams);
  if (!query) return "clean";

  const keys = Object.keys(query).map((key) => key.toLowerCase());
  if (keys.length === 0) return "clean";

  const nonTrackingKeys = keys.filter((key) => !TRACKING_QUERY_KEYS.has(key));
  if (nonTrackingKeys.length === 0) return "tracking";
  if (nonTrackingKeys.some((key) => SEARCH_QUERY_KEYS.has(key))) return "search";
  return "variant";
}

export function createPageMetadata(input: {
  title: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  robots?: Metadata["robots"];
}): Metadata {
  const normalizedTitle = normalizeMetadataTitle(input.title);
  const description = input.description || DEFAULT_DESCRIPTION;
  const metadata: Metadata = {
    title: normalizedTitle,
    description,
    openGraph: {
      title: normalizedTitle,
      description,
      siteName: "Shortbox",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: normalizedTitle,
      description,
    },
  };

  if (input.robots) {
    metadata.robots = input.robots;
  } else if (input.noIndex) {
    metadata.robots = buildRobots(false, true);
  }

  if (input.canonical) {
    metadata.alternates = {
      canonical: input.canonical.startsWith("http")
        ? input.canonical
        : `${SITE_URL}${input.canonical}`,
    };
  }

  return metadata;
}

export function createRouteMetadata(input: {
  title: string;
  description?: string;
  canonical?: string;
  searchParams?: MetadataSearchParamsInput;
  noIndex?: boolean;
}): Metadata {
  const queryMode = getRouteQueryMode(input.searchParams);
  let robots: Metadata["robots"];
  if (queryMode === "search") {
    robots = buildRobots(false, false);
  } else if (input.noIndex || queryMode === "variant") {
    robots = buildRobots(false, true);
  } else {
    robots = undefined;
  }

  return createPageMetadata({
    title: input.title,
    description: input.description,
    canonical: queryMode === "search" ? undefined : input.canonical,
    robots,
  });
}

export function createHomeMetadata(us: boolean, searchParams?: MetadataSearchParamsInput): Metadata {
  return createRouteMetadata({
    title: us ? "US-Ausgaben" : "Deutsche Ausgaben",
    description: us
      ? "US-Marvel-Ausgaben in Shortbox mit Serien, Heften, Varianten und direkten Detailseiten auf einen Blick."
      : "Deutsche Marvel-Ausgaben in Shortbox mit Serien, Heften, Varianten und direkten Detailseiten auf einen Blick.",
    canonical: us ? "/us" : "/de",
    searchParams,
  });
}

export function createStaticMetadata(
  title: string,
  description: string,
  options?: { canonical?: string; noIndex?: boolean }
): Metadata {
  return createPageMetadata({
    title,
    description,
    canonical: options?.canonical,
    noIndex: options?.noIndex,
  });
}

/**
 * Metadata for workspace/tool pages that must never be indexed.
 * Use this for edit, create, copy, report, admin and filter routes.
 */
export function createWorkspaceMetadata(title: string): Metadata {
  return createPageMetadata({
    title,
    noIndex: true,
  });
}
