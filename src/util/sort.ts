/**
 * Computes a normalized sort key for a series or comic title.
 *
 * Rules applied in order:
 * 1. Trim whitespace.
 * 2. Strip a leading article ("Der", "Die", "Das", "The") followed by a space.
 * 3. Replace punctuation characters with a space (so hyphens become word separators).
 * 4. Normalize German umlauts: ä→a, ö→o, ü→u, ß→ss (case-insensitive).
 * 5. Collapse multiple spaces and lower-case the result.
 *
 * The result is suitable for locale-independent string comparison (e.g. `<` / `>`).
 */
export function seriesSortKey(title: string): string {
  let s = title.trim();

  // Strip leading articles (case-insensitive, must be followed by a space)
  s = s.replace(/^(Der|Die|Das|The)\s+/i, "");

  // Replace punctuation with a space so that hyphens etc. become word separators
  s = s.replace(/[^\p{L}\p{N}\s]/gu, " ");

  // Normalize German umlauts and ß
  s = s
    .replace(/ä/gi, (c) => (c === "Ä" ? "A" : "a"))
    .replace(/ö/gi, (c) => (c === "Ö" ? "O" : "o"))
    .replace(/ü/gi, (c) => (c === "Ü" ? "U" : "u"))
    .replace(/ß/g, "ss");

  // Collapse whitespace and lower-case
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Comparator for series titles using `seriesSortKey`.
 * Suitable for use with `Array.prototype.sort`.
 */
export function compareSeriesTitle(a: string, b: string): number {
  return seriesSortKey(a).localeCompare(seriesSortKey(b), "de", { sensitivity: "base" });
}
