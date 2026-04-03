import type { CSSProperties } from "react";
import { getPreferredCoverUrl } from "../../generic/coverUrl";

interface StoryParent {
  children?: Array<unknown | null> | null;
  collectedmultipletimes?: boolean | null;
}

interface StoryChild {
  issue?: { collected?: boolean | null } | null;
}

interface StoryLike {
  onlyapp?: boolean | null;
  firstapp?: boolean | null;
  otheronlytb?: boolean | null;
  exclusive?: boolean | null;
  onlyoneprint?: boolean | null;
  onlytb?: boolean | null;
  reprintOf?: unknown;
  reprints?: Array<unknown | null> | null;
  parent?: StoryParent | null;
  children?: Array<StoryChild | null> | null;
  collectedmultipletimes?: boolean | null;
}

interface CoverLike {
  url?: string | null;
}

export type PreviewIssue = {
  id?: string | number | null;
  comicguideid?: string | number | null;
  number?: string | null;
  legacy_number?: string | null;
  title?: string | null;
  verified?: boolean | null;
  stories?: Array<StoryLike | null> | null;
  cover?: CoverLike | null;
  collected?: boolean | null;
  format?: string | null;
  variant?: string | null;
  series?: {
    title?: string | null;
    volume?: number | null;
    startyear?: number | null;
    endyear?: number | null;
    publisher?: { name?: string | null; us?: boolean | null } | null;
  } | null;
};

export type IssuePreviewFlags = {
  collected: boolean;
  collectedMultipleTimes: boolean;
  sellable: number;
  hasOnlyApp: boolean;
  hasFirstApp: boolean;
  hasOtherOnlyTb: boolean;
  hasExclusive: boolean;
  isPureReprintDe: boolean;
  hasNoStoriesDe: boolean;
  hasOnlyOnePrintUs: boolean;
  hasOnlyTbUs: boolean;
  notPublishedInDe: boolean;
  hasReprintOfUs: boolean;
  hasReprintsUs: boolean;
};

export function getIssueVariantLabel(issue: PreviewIssue): string {
  if (!issue.format) return "";

  let variant = issue.format;
  if (issue.variant) variant += " (" + issue.variant + " Variant)";

  return variant;
}

export function getIssuePreviewCover(
  issue: PreviewIssue,
  us: boolean
): { coverUrl: string; blurCover: boolean } {
  void us;
  const coverUrl = getPreferredCoverUrl(issue);
  if (coverUrl) return { coverUrl, blurCover: false };

  return { coverUrl: "", blurCover: false };
}

export function getIssuePreviewBorderRadius(
  idx?: number,
  isLast?: boolean
): CSSProperties["borderRadius"] {
  if (idx === 0) return isLast ? "8px" : "8px 8px 0 0";
  if (isLast) return "0 0 8px 8px";
  return 0;
}

export function getIssuePreviewFlags(
  issue: PreviewIssue,
  us: boolean,
  hasSession: boolean
): IssuePreviewFlags {
  const stories = (issue.stories || []).filter((story): story is StoryLike => Boolean(story));

  const hasOnlyApp = stories.some((story) => Boolean(story.onlyapp));
  const hasFirstApp = stories.some((story) => Boolean(story.firstapp));
  const hasOtherOnlyTb = stories.some((story) => Boolean(story.otheronlytb));
  const hasExclusive = stories.some((story) => Boolean(story.exclusive));
  const hasOnlyOnePrintUs = stories.some((story) => Boolean(story.onlyoneprint));
  const hasOnlyTbUs = stories.some((story) => Boolean(story.onlytb));
  const hasReprintOfUs = stories.some((story) => Boolean(story.reprintOf));
  const hasReprintsUs = stories.some((story) => (story.reprints?.length || 0) > 0);

  const allAreChildrenReprints =
    stories.length > 0 && stories.every((story) => (story.parent?.children?.length || 0) > 1);
  const isPureReprintDe = !us && allAreChildrenReprints && !hasFirstApp;

  const hasNoStoriesDe = !us && stories.length === 0;
  const notPublishedInDe = us && stories.every((story) => (story.children?.length || 0) === 0);

  let collected = Boolean(issue.collected);
  let collectedMultipleTimes = false;
  let sellable = 0;

  if (us) {
    for (const story of stories) {
      if (!collectedMultipleTimes && story.collectedmultipletimes === true) {
        collectedMultipleTimes = true;
      }

      for (const child of story.children || []) {
        if (!child) continue;
        if (collected) continue;
        if (child.issue?.collected) {
          collected = true;
        }
      }
    }
  } else {
    for (const story of stories) {
      if (story.parent?.collectedmultipletimes === true) {
        sellable += 1;
        if (!collectedMultipleTimes) collectedMultipleTimes = true;
      }
    }
  }

  if (!hasSession) {
    collected = false;
    collectedMultipleTimes = false;
    sellable = 0;
  }

  return {
    collected,
    collectedMultipleTimes,
    sellable,
    hasOnlyApp,
    hasFirstApp,
    hasOtherOnlyTb,
    hasExclusive,
    isPureReprintDe,
    hasNoStoriesDe,
    hasOnlyOnePrintUs,
    hasOnlyTbUs,
    notPublishedInDe,
    hasReprintOfUs,
    hasReprintsUs,
  };
}
