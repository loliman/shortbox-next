import type { CSSProperties } from "react";
import { getPreferredCoverUrl } from "../../generic/coverUrl";

interface StoryParent {
  children?: Array<Record<string, unknown> | null> | null;
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
  reprintOf?: Record<string, unknown> | null;
  reprints?: Array<Record<string, unknown> | null> | null;
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

export function getIssuePreviewCover(issue: PreviewIssue): { coverUrl: string; blurCover: boolean } {
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

function readStories(issue: PreviewIssue): StoryLike[] {
  return (issue.stories || []).filter((story): story is StoryLike => Boolean(story));
}

function readStoryFlags(stories: StoryLike[], us: boolean) {
  const hasFirstApp = stories.some((story) => Boolean(story.firstapp));
  const allAreChildrenReprints =
    stories.length > 0 && stories.every((story) => (story.parent?.children?.length || 0) > 1);

  return {
    hasOnlyApp: stories.some((story) => Boolean(story.onlyapp)),
    hasFirstApp,
    hasOtherOnlyTb: stories.some((story) => Boolean(story.otheronlytb)),
    hasExclusive: stories.some((story) => Boolean(story.exclusive)),
    hasOnlyOnePrintUs: stories.some((story) => Boolean(story.onlyoneprint)),
    hasOnlyTbUs: stories.some((story) => Boolean(story.onlytb)),
    hasReprintOfUs: stories.some((story) => Boolean(story.reprintOf)),
    hasReprintsUs: stories.some((story) => (story.reprints?.length || 0) > 0),
    isPureReprintDe: !us && allAreChildrenReprints && !hasFirstApp,
    hasNoStoriesDe: !us && stories.length === 0,
    notPublishedInDe: us && stories.every((story) => (story.children?.length || 0) === 0),
  };
}

function readUsCollectionState(stories: StoryLike[], collected: boolean) {
  let collectedMultipleTimes = false;
  let isCollected = collected;

  for (const story of stories) {
    if (!collectedMultipleTimes && story.collectedmultipletimes === true) {
      collectedMultipleTimes = true;
    }

    if (isCollected) continue;
    for (const child of story.children || []) {
      if (child?.issue?.collected) {
        isCollected = true;
        break;
      }
    }
  }

  return { collected: isCollected, collectedMultipleTimes, sellable: 0 };
}

function readDeCollectionState(stories: StoryLike[], collected: boolean) {
  let collectedMultipleTimes = false;
  let sellable = 0;

  for (const story of stories) {
    if (story.parent?.collectedmultipletimes !== true) continue;
    sellable += 1;
    collectedMultipleTimes = true;
  }

  return { collected, collectedMultipleTimes, sellable };
}

export function getIssuePreviewFlags(
  issue: PreviewIssue,
  us: boolean,
  hasSession: boolean
): IssuePreviewFlags {
  const stories = readStories(issue);
  const flags = readStoryFlags(stories, us);
  let collectionState = { collected: false, collectedMultipleTimes: false, sellable: 0 };

  if (hasSession) {
    collectionState = us
      ? readUsCollectionState(stories, Boolean(issue.collected))
      : readDeCollectionState(stories, Boolean(issue.collected));
  }

  return {
    collected: collectionState.collected,
    collectedMultipleTimes: collectionState.collectedMultipleTimes,
    sellable: collectionState.sellable,
    ...flags,
  };
}
