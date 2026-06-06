type NavigationVariantCandidate = {
  comicGuideId?: bigint | null;
  covers?: Array<{ url?: string | null } | null> | null;
};

type NavigationIssueCandidate = {
  variants?: Array<NavigationVariantCandidate | null> | null;
};

export function serializeNavigationComicGuideId(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized === "" || normalized === "0" ? null : normalized;
}

function hasNavigationPreviewSource(variant: NavigationVariantCandidate): boolean {
  const directCover = variant.covers?.[0]?.url?.trim();
  if (directCover) return true;
  return serializeNavigationComicGuideId(variant.comicGuideId) !== null;
}

/** Returns the preferred variant (first with cover or comicGuideId) from an issue. */
export function pickNavigationIssuePreviewVariant<T extends NavigationVariantCandidate>(variants: T[]): T | null {
  return variants.find(hasNavigationPreviewSource) ?? variants[0] ?? null;
}

/**
 * @deprecated Use pickNavigationIssuePreviewVariant instead.
 * Kept for call sites not yet migrated.
 */
export function pickNavigationIssuePreviewSource<T extends NavigationIssueCandidate>(issues: T[]): T | null {
  return issues.find((issue) =>
    (issue.variants ?? []).some((v) => v && hasNavigationPreviewSource(v))
  ) ?? issues[0] ?? null;
}
