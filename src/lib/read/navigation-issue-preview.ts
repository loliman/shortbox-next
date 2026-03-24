type NavigationIssueCandidate = {
  comicGuideId?: bigint | null;
  covers?: Array<{ url?: string | null } | null> | null;
};

export function serializeNavigationComicGuideId(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized === "" || normalized === "0" ? null : normalized;
}

function hasNavigationPreviewSource(issue: NavigationIssueCandidate): boolean {
  const directCover = issue.covers?.[0]?.url?.trim();
  if (directCover) return true;
  return serializeNavigationComicGuideId(issue.comicGuideId) !== null;
}

export function pickNavigationIssuePreviewSource<T extends NavigationIssueCandidate>(issues: T[]): T | null {
  return issues.find(hasNavigationPreviewSource) || issues[0] || null;
}

