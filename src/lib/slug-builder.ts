/**
 * Slug builder utilities for SEO-friendly URLs
 * Handles consistent, stable slug generation and normalization.
 *
 * Slug rules (applied in order):
 *  1. Trim leading/trailing whitespace
 *  2. Replace German umlauts: ä→ae, ö→oe, ü→ue, ß→ss (before NFD so ä is not split to a+umlaut)
 *  3. NFD-normalize remaining accented Latin characters, then strip combining marks
 *  4. Lowercase
 *  5. Replace whitespace, underscores and path separators with hyphens
 *  6. Remove every character that is not a-z, 0-9 or hyphen
 *  7. Collapse repeated hyphens
 *  8. Trim hyphens from both ends
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return "";

  return text
    .trim()
    // German umlauts — must run BEFORE .normalize("NFD") so that ä is replaced with "ae"
    // rather than being decomposed to a+combining-diaeresis and then just yielding "a".
    .replaceAll(/[äÄ]/g, "ae")
    .replaceAll(/[öÖ]/g, "oe")
    .replaceAll(/[üÜ]/g, "ue")
    .replaceAll("ß", "ss")
    // Decompose accented Latin characters (e.g. é → e + ́) then strip the combining marks
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Replace whitespace, underscores and common path separators with hyphens
    .replaceAll(/[\s_/\\]+/g, "-")
    // Drop everything that is not a-z, 0-9 or hyphen
    .replaceAll(/[^a-z0-9-]/g, "")
    // Collapse consecutive hyphens
    .replaceAll(/-+/g, "-")
    // Strip leading/trailing hyphens
    .replaceAll(/^-+|-+$/g, "");
}

/**
 * Generate publisher slug
 * Example: "Marvel" → "marvel", "DC Comics" → "dc-comics"
 */
export function generatePublisherSlug(publisherName: string | null | undefined): string {
  return slugify(publisherName);
}

/**
 * Generate series slug with year and volume
 * Example: {title: "Amazing Spider-Man", startYear: 1963, volume: 1} → "amazing-spider-man-1963-vol1"
 */
export function generateSeriesSlug(
  seriesTitle: string | null | undefined,
  startYear: number | null | undefined,
  volume: number | null | undefined
): string {
  const titleSlug = slugify(seriesTitle);
  const year = startYear && startYear > 0 ? String(startYear) : "";
  const vol = volume !== null && volume !== undefined ? String(volume) : "1";

  const parts = [titleSlug, year, `vol${vol}`].filter(Boolean);
  return parts.join("-");
}

/**
 * Generate format slug
 * Example: "Heft" → "heft", "Comic Book" → "comic-book"
 */
export function generateFormatSlug(format: string | null | undefined): string {
  return slugify(format);
}

/**
 * Generate variant slug
 * Example: "Standard" → "standard", "Variant A" → "variant-a"
 */
export function generateVariantSlug(variant: string | null | undefined): string {
  return slugify(variant);
}

/**
 * Generate person / individual slug
 * Example: "Peter Parker" → "peter-parker"
 */
export function generatePersonSlug(name: string | null | undefined): string {
  return slugify(name);
}

/**
 * Generate story-arc slug
 * Example: "Maximum Carnage" → "maximum-carnage"
 */
export function generateArcSlug(title: string | null | undefined): string {
  return slugify(title);
}

/**
 * Generate appearance slug (characters, objects, locations, …)
 * Example: "Spider-Man" → "spider-man"
 */
export function generateAppearanceSlug(name: string | null | undefined): string {
  return slugify(name);
}

/**
 * Generate genre slug
 * Example: "Science Fiction" → "science-fiction"
 */
export function generateGenreSlug(genre: string | null | undefined): string {
  return slugify(genre);
}

/**
 * Build complete SEO-friendly issue URL path segments
 * Returns object with all required segments for URL construction
 */
export interface IssueUrlSegments {
  locale: "de" | "us";
  publisherSlug: string;
  seriesSlug: string;
  issueNumber: string;
  formatSlug?: string;
  variantSlug?: string;
}

/**
 * Generate full issue URL path
 * Example: /de/marvel/amazing-spider-man-1963-vol1/1/heft/standard
 */
export function buildIssueUrlPath(segments: IssueUrlSegments): string {
  const parts = [
    "",
    segments.locale,
    segments.publisherSlug,
    segments.seriesSlug,
    encodeURIComponent(segments.issueNumber),
  ];

  if (segments.formatSlug) {
    parts.push(segments.formatSlug);
    if (segments.variantSlug) {
      parts.push(segments.variantSlug);
    }
  }

  return parts.join("/");
}

/**
 * Helper to build all URL segments from issue data
 */
export function buildIssueUrlSegments(
  locale: "de" | "us",
  publisherName: string | null | undefined,
  seriesTitle: string | null | undefined,
  seriesStartYear: number | null | undefined,
  seriesVolume: number | null | undefined,
  issueNumber: string | null | undefined,
  format?: string | null | undefined,
  variant?: string | null | undefined
): IssueUrlSegments {
  return {
    locale,
    publisherSlug: generatePublisherSlug(publisherName),
    seriesSlug: generateSeriesSlug(seriesTitle, seriesStartYear, seriesVolume),
    issueNumber: issueNumber ?? "",
    formatSlug: format ? generateFormatSlug(format) : undefined,
    variantSlug: variant ? generateVariantSlug(variant) : undefined,
  };
}
