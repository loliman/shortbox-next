/**
 * URL builder helpers for SEO-friendly detail and filter URLs.
 *
 * Detail page URLs use the slug-based SEO structure:
 *   /[locale]/[publisherSlug]/[seriesSlug]/[issueNumber]/[formatSlug]/[variantSlug]
 *
 * Filter URLs use the existing query-param approach, producing URLs like:
 *   /de?filter=<JSON>
 *
 * All helpers are pure functions and deterministic — same input always
 * yields the same output.
 */

import { buildIssueUrlPath, buildIssueUrlSegments } from "./slug-builder";
import {
  generateAppearanceSlug,
  generateArcSlug,
  generateGenreSlug,
  generatePersonSlug,
} from "./slug-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = "de" | "us";

export interface DetailPageUrlInput {
  locale: Locale;
  publisherName: string | null | undefined;
  seriesTitle: string | null | undefined;
  seriesYear: number | null | undefined;
  seriesVolume: number | null | undefined;
  issueNumber: string | null | undefined;
  format?: string | null | undefined;
  variant?: string | null | undefined;
}

// ---------------------------------------------------------------------------
// Detail page URLs
// ---------------------------------------------------------------------------

/**
 * Build a SEO-friendly detail page URL for an issue.
 *
 * @example
 * buildDetailPageUrl({
 *   locale: "de",
 *   publisherName: "Marvel",
 *   seriesTitle: "Amazing Spider-Man",
 *   seriesYear: 1963,
 *   seriesVolume: 1,
 *   issueNumber: "1",
 *   format: "Heft",
 *   variant: "Standard",
 * })
 * // → "/de/marvel/amazing-spider-man-1963-vol1/1/heft/standard"
 */
export function buildDetailPageUrl(input: DetailPageUrlInput): string {
  const segments = buildIssueUrlSegments(
    input.locale,
    input.publisherName,
    input.seriesTitle,
    input.seriesYear,
    input.seriesVolume,
    input.issueNumber,
    input.format,
    input.variant
  );
  return buildIssueUrlPath(segments);
}

// ---------------------------------------------------------------------------
// Internal route URL builder
// ---------------------------------------------------------------------------

/**
 * Build an entity landing page URL under the locale namespace.
 * Example: /de/person/peter-parker
 */
function buildSeoFilterLandingUrl(locale: Locale, type: "person" | "arc" | "appearance" | "genre", slug: string): string {
  return `/${locale}/${type}/${slug}`;
}

// ---------------------------------------------------------------------------
// Person / Individual filter URLs
// ---------------------------------------------------------------------------

/**
 * Build a route-based person landing URL.
 *
 * @param locale  "de" or "us"
 * @param name    Individual's name (raw DB value)
 *
 * @example
 * buildPersonFilterUrl("de", "Peter Parker")
 * // → "/de/person/peter-parker"
 */
export function buildPersonFilterUrl(
  locale: Locale,
  name: string,
  _type?: string
): string {
  return buildSeoFilterLandingUrl(locale, "person", generatePersonSlug(name));
}

// ---------------------------------------------------------------------------
// Arc filter URLs
// ---------------------------------------------------------------------------

/**
 * Build a route-based arc landing URL.
 *
 * @param locale  "de" or "us"
 * @param title   Arc title (raw DB value)
 *
 * @example
 * buildArcFilterUrl("us", "Maximum Carnage")
 * // → "/us/arc/maximum-carnage"
 */
export function buildArcFilterUrl(
  locale: Locale,
  title: string,
  _type?: string
): string {
  return buildSeoFilterLandingUrl(locale, "arc", generateArcSlug(title));
}

// ---------------------------------------------------------------------------
// Appearance filter URLs
// ---------------------------------------------------------------------------

/**
 * Build a route-based appearance landing URL.
 *
 * @param locale  "de" or "us"
 * @param name    Appearance name (raw DB value)
 *
 * @example
 * buildAppearanceFilterUrl("de", "Spider-Man")
 * // → "/de/appearance/spider-man"
 */
export function buildAppearanceFilterUrl(
  locale: Locale,
  name: string,
  _type?: string
): string {
  return buildSeoFilterLandingUrl(locale, "appearance", generateAppearanceSlug(name));
}

// ---------------------------------------------------------------------------
// Genre filter URLs
// ---------------------------------------------------------------------------

/**
 * Build a route-based genre landing URL.
 *
 * @param locale  "de" or "us"
 * @param genre   Genre string (raw DB value, e.g. "Science Fiction")
 *
 * @example
 * buildGenreFilterUrl("de", "Science Fiction")
 * // → "/de/genre/science-fiction"
 */
export function buildGenreFilterUrl(locale: Locale, genre: string): string {
  return buildSeoFilterLandingUrl(locale, "genre", generateGenreSlug(genre));
}

