/**
 * Slug parser utilities for extracting data from SEO-friendly URLs.
 *
 * Parsing is inherently a "best-effort" reconstruction: slugs are one-way
 * transforms, so the parsed value is used as a search/lookup term, not as
 * an exact identifier. Database lookups should use case-insensitive matching.
 *
 * All parsers return `null` for empty or structurally invalid input.
 * Call `notFound()` from Next.js in your page when you receive `null`.
 */

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates that a slug is well-formed:
 * - non-empty
 * - contains only lowercase letters, digits and hyphens
 * - does not start or end with a hyphen
 *
 * Returns the slug unchanged when valid, `null` otherwise.
 * Useful for early validation before triggering DB lookups.
 *
 * @example
 * validateSlug("marvel")          // → "marvel"
 * validateSlug("amazing-spider-man-1963-vol1") // → "amazing-..."
 * validateSlug("")                // → null
 * validateSlug("--bad--")        // → null
 */
export function validateSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) return null;
  return slug;
}

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

/**
 * Convert a hyphenated slug fragment back to a title-cased string.
 * "amazing-spider-man" → "Amazing Spider Man"
 * (Hyphens that were part of the original name, e.g. in "Spider-Man", are
 * irretrievably lost — callers must use contains/ilike DB queries.)
 */
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Series slug
// ---------------------------------------------------------------------------

/**
 * Parse series slug to extract components.
 * Format: `title-year-volN` where year is optional.
 *
 * @example
 * parseSeriesSlug("amazing-spider-man-1963-vol1")
 * // → { title: "Amazing Spider Man", year: 1963, volume: 1 }
 */
export interface ParsedSeriesSlug {
  title: string;
  year: number | null;
  volume: number;
}

export function parseSeriesSlug(slug: string): ParsedSeriesSlug | null {
  if (!slug) return null;

  // Extract volume suffix: vol1, vol2, …
  const volMatch = slug.match(/vol(\d+)$/i);
  if (!volMatch) return null;

  const volume = Number.parseInt(volMatch[1], 10);
  const withoutVol = slug.substring(0, slug.length - volMatch[0].length).replace(/-$/, "");

  // Optionally extract 4-digit year immediately before the vol suffix
  const yearMatch = withoutVol.match(/-(\d{4})$/);
  let title = withoutVol;
  let year: number | null = null;

  if (yearMatch) {
    const y = Number.parseInt(yearMatch[1], 10);
    if (y > 0) {
      year = y;
      title = withoutVol.substring(0, withoutVol.length - yearMatch[0].length);
    }
  }

  return { title: slugToTitle(title), year, volume };
}

// ---------------------------------------------------------------------------
// Publisher slug
// ---------------------------------------------------------------------------

/**
 * Reconstruct a publisher name from a slug.
 * "dc-comics" → "Dc Comics"  (the caller should use case-insensitive DB matching)
 */
export function parsePublisherSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return slugToTitle(slug);
}

// ---------------------------------------------------------------------------
// Issue / format / variant
// ---------------------------------------------------------------------------

/** Decode a URL-encoded issue number segment. */
export function parseIssueNumber(segment: string): string {
  if (!segment) return "";
  return decodeURIComponent(segment);
}

/**
 * "heft" → "Heft"
 * "comic-book" → "Comic Book"
 */
export function parseFormatSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return slugToTitle(slug);
}

/**
 * "variant-a" → "Variant A"
 * "kiosk-ausgabe" → "Kiosk Ausgabe"
 */
export function parseVariantSlug(slug: string | undefined): string | undefined {
  if (!slug) return undefined;
  return slugToTitle(slug);
}

// ---------------------------------------------------------------------------
// Person / Individual slug
// ---------------------------------------------------------------------------

/**
 * Reconstruct a person name from a slug.
 * "peter-parker" → "Peter Parker"
 * Returns `null` for empty input — use `notFound()` in your page.
 */
export function parsePersonSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return slugToTitle(slug);
}

// ---------------------------------------------------------------------------
// Arc slug
// ---------------------------------------------------------------------------

/**
 * Reconstruct an arc title from a slug.
 * "maximum-carnage" → "Maximum Carnage"
 * Returns `null` for empty input.
 */
export function parseArcSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return slugToTitle(slug);
}

// ---------------------------------------------------------------------------
// Appearance slug
// ---------------------------------------------------------------------------

/**
 * Reconstruct an appearance name from a slug.
 * "spider-man" → "Spider Man"
 * Returns `null` for empty input.
 */
export function parseAppearanceSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return slugToTitle(slug);
}

// ---------------------------------------------------------------------------
// Genre slug
// ---------------------------------------------------------------------------

/**
 * Reconstruct a genre name from a slug.
 * "science-fiction" → "Science Fiction"
 * Returns `null` for empty input.
 */
export function parseGenreSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return slugToTitle(slug);
}

// ---------------------------------------------------------------------------
// Full issue URL parsing
// ---------------------------------------------------------------------------

export interface ParsedIssueUrl {
  publisherName: string;
  seriesTitle: string;
  seriesYear: number | null;
  seriesVolume: number;
  issueNumber: string;
  format?: string;
  variant?: string;
}

/**
 * Parse all segments of a SEO issue URL into structured data.
 * Returns `null` if any required segment is invalid (trigger `notFound()`).
 */
export function parseIssueUrl(
  publisherSlug: string,
  seriesSlug: string,
  issueNumber: string,
  formatSlug?: string | undefined,
  variantSlug?: string | undefined
): ParsedIssueUrl | null {
  const publisherName = parsePublisherSlug(publisherSlug);
  if (!publisherName) return null;

  const parsedSeries = parseSeriesSlug(seriesSlug);
  if (!parsedSeries) return null;

  const parsedIssueNumber = parseIssueNumber(issueNumber);
  if (!parsedIssueNumber) return null;

  return {
    publisherName,
    seriesTitle: parsedSeries.title,
    seriesYear: parsedSeries.year,
    seriesVolume: parsedSeries.volume,
    issueNumber: parsedIssueNumber,
    format: parseFormatSlug(formatSlug),
    variant: parseVariantSlug(variantSlug),
  };
}

