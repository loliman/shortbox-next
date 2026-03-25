import { getLegacyNumberLabel, getSeriesLabel } from "../../util/issuePresentation";
import { slugify } from "../../lib/slug-builder";
import type { Issue, SelectedRoot, Series } from "../../types/domain";

export type PublisherNode = {
  id?: string | null;
  name?: string | null;
  us?: boolean | null;
};

export type SeriesNode = {
  id?: string | null;
  title?: string | null;
  volume?: number | null;
  startyear?: number | null;
  endyear?: number | null;
  publisher?: PublisherNode | null;
};

export type IssueNode = {
  id?: string | null;
  comicguideid?: string | null;
  number?: string | null;
  legacy_number?: string | null;
  title?: string | null;
  format?: string | null;
  variant?: string | null;
  collected?: boolean | null;
  cover?: { url?: string | null } | null;
  variants?: Array<{ collected?: boolean | null; format?: string | null; variant?: string | null } | null> | null;
  series?: {
    title?: string | null;
    volume?: number | null;
    startyear?: number | null;
    endyear?: number | null;
    publisher?: PublisherNode | null;
  } | null;
};

export type NavListAction =
  | {
      type: "closeAll";
      token: number;
    }
  | {
      type: "showAll";
      token: number;
      scope: "root" | "publisher" | "series";
      publisherName?: string | null;
      seriesKey?: string | null;
    }
  | {
      type: "scrollToSelected";
      token: number;
      publisherName?: string | null;
      seriesKey?: string | null;
      rowKey?: string | null;
    };

export function getDepthPadding(depth: number) {
  return 2 + depth * 2;
}

export function createIssueSecondary(issueNode: IssueNode, showCollected: boolean): string | undefined {
  const parts: string[] = [];

  if (
    showCollected &&
    (issueNode.collected || issueNode.variants?.some((entry) => entry?.collected))
  ) {
    parts.push("Gesammelt");
  }

  return parts.length > 0 ? parts.join(" • ") : undefined;
}

export function getVariantCount(issueNode: IssueNode): number {
  const total = issueNode.variants?.length || 0;
  return total > 1 ? total - 1 : 0;
}

export function createSeriesLabel(seriesNode: SeriesNode): string {
  return getSeriesLabel(seriesNode, { fallbackYear: "?" });
}

export function createIssueSeriesLabel(issueNode: IssueNode, us: boolean): string {
  const seriesTitle = issueNode.series?.title || "";
  const variant = getIssueNodeVariant(issueNode);
  const variantLabel = variant ? ` [${variant}]` : "";
  if (us) return seriesTitle;
  if (issueNode.title && issueNode.title !== "") return `${issueNode.title}${variantLabel}`;
  return `${seriesTitle}${variantLabel}`;
}

export function createSidebarIssueLabel(issueNode: IssueNode, us: boolean): string {
  const number = issueNode.number ? `#${issueNode.number}` : "";
  const legacyLabel = getLegacyNumberLabel(issueNode);
  const seriesLabel = createIssueSeriesLabel(issueNode, us);

  return [number, legacyLabel, seriesLabel].filter(Boolean).join(" ");
}

export function getSelectedPublisherName(selected: SelectedRoot): string {
  return (
    selected?.publisher?.name ||
    selected?.series?.publisher?.name ||
    selected?.issue?.series?.publisher?.name ||
    ""
  );
}

export function getSeriesKey(seriesNode: SeriesNode): string {
  return [
    normalizeSeriesKeyText(seriesNode.publisher?.name),
    normalizeSeriesKeyText(seriesNode.title),
    normalizeSeriesVolume(seriesNode.volume),
    normalizeSeriesStartYear(seriesNode.startyear),
  ].join("|");
}

export function getSelectedSeriesKey(selected: SelectedRoot): string | null {
  const seriesNode = selected?.series || selected?.issue?.series;
  if (!seriesNode?.title) return null;
  return [
    normalizeSeriesKeyText(seriesNode.publisher?.name),
    normalizeSeriesKeyText(seriesNode.title),
    normalizeSeriesVolume(seriesNode.volume),
    normalizeSeriesStartYear(seriesNode.startyear),
  ].join("|");
}

export function toSeriesSelected(seriesNode: SeriesNode, us: boolean): Series {
  return {
    title: seriesNode.title || "",
    volume: seriesNode.volume ?? 1,
    startyear: seriesNode.startyear ?? null,
    endyear: seriesNode.endyear ?? null,
    publisher: {
      name: seriesNode.publisher?.name || "",
      us: seriesNode.publisher?.us ?? us,
    },
  };
}

export function toIssueSeriesSelected(
  issueNode: IssueNode,
  fallbackSeries: SeriesNode,
  us: boolean
): Series {
  return {
    title: issueNode.series?.title || fallbackSeries.title || "",
    volume: issueNode.series?.volume ?? fallbackSeries.volume ?? 1,
    startyear: issueNode.series?.startyear ?? fallbackSeries.startyear ?? null,
    endyear: issueNode.series?.endyear ?? fallbackSeries.endyear ?? null,
    publisher: {
      name: issueNode.series?.publisher?.name || fallbackSeries.publisher?.name || "",
      us: issueNode.series?.publisher?.us ?? fallbackSeries.publisher?.us ?? us,
    },
  };
}

export function isSelectedIssue(
  issueNode: IssueNode,
  selectedIssue: Issue | undefined,
  seriesNode: SeriesNode
): boolean {
  const selectedNumber = normalizeIssueNumber(selectedIssue?.number);
  if (selectedNumber === "") return false;
  if (!isIssueNumberMatch(issueNode.number, selectedNumber)) return false;
  return doesSeriesNodeMatchIssueSeries(seriesNode, selectedIssue?.series);
}

export function normalizeIssuePart(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizeIssueNumber(value: unknown): string {
  return normalizeIssuePart(value).replace(/\s+/g, "").toUpperCase();
}

export function getIssueNumberPrefix(number: string): string {
  const match = number.match(/^\d+/);
  return match ? match[0] : "";
}

export function isIssueNumberMatch(nodeNumberRaw: unknown, selectedNumberRaw: unknown): boolean {
  const nodeNumber = normalizeIssueNumber(nodeNumberRaw);
  const selectedNumber = normalizeIssueNumber(selectedNumberRaw);
  if (!nodeNumber || !selectedNumber) return false;
  if (nodeNumber === selectedNumber) return true;

  const nodePrefix = getIssueNumberPrefix(nodeNumber);
  const selectedPrefix = getIssueNumberPrefix(selectedNumber);
  if (nodePrefix && selectedPrefix && nodePrefix === selectedPrefix) return true;

  return false;
}

export function normalizeSeriesVolume(value: unknown): string {
  if (value === null || value === undefined) return "";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? String(numericValue) : "";
}

export function normalizeSeriesStartYear(value: unknown): string {
  if (value === null || value === undefined) return "";
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? String(numericValue) : "";
}

export function doesSeriesNodeMatchIssueSeries(
  seriesNode: { title?: unknown; volume?: unknown; startyear?: unknown; publisher?: { name?: unknown } | null },
  selectedSeries?: Issue["series"]
): boolean {
  if (!selectedSeries) return false;

  const nodePublisher = normalizeSeriesKeyText(seriesNode.publisher?.name);
  const selectedPublisher = normalizeSeriesKeyText(selectedSeries.publisher?.name);
  if (!nodePublisher || !selectedPublisher || nodePublisher !== selectedPublisher) return false;

  const nodeTitle = normalizeSeriesKeyText(seriesNode.title);
  const selectedTitle = normalizeSeriesKeyText(selectedSeries.title);
  if (!nodeTitle || !selectedTitle || nodeTitle !== selectedTitle) return false;

  const nodeVolume = normalizeSeriesVolume(seriesNode.volume);
  const selectedVolume = normalizeSeriesVolume(selectedSeries.volume);
  if (nodeVolume && selectedVolume && nodeVolume !== selectedVolume) return false;

  const nodeStartYear = normalizeSeriesStartYear(seriesNode.startyear);
  const selectedStartYear = normalizeSeriesStartYear(selectedSeries.startyear);
  if (nodeStartYear && selectedStartYear && nodeStartYear !== selectedStartYear) return false;

  return true;
}

export function normalizeMatchText(value: unknown): string {
  return normalizeIssuePart(value).replace(/\s+/g, " ").toLowerCase();
}

export function normalizeSeriesKeyText(value: unknown): string {
  return slugify(normalizeIssuePart(value));
}

export function isSameEntityName(left: unknown, right: unknown): boolean {
  const normalizedLeft = normalizeSeriesKeyText(left);
  const normalizedRight = normalizeSeriesKeyText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  return normalizedLeft === normalizedRight;
}

export function isSeriesNodeSelected(
  seriesNode: SeriesNode,
  activeSeriesKey: string | null,
  selectedIssue?: Issue
): boolean {
  const seriesKey = getSeriesKey(seriesNode);
  if (activeSeriesKey && activeSeriesKey === seriesKey) return true;
  return doesSeriesNodeMatchIssueSeries(seriesNode, selectedIssue?.series);
}

export function isElementVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return elementRect.bottom > containerRect.top && elementRect.top < containerRect.bottom;
}

export function getIssueNodeVariant(issueNode: IssueNode): string | undefined {
  const rawVariant = (issueNode as unknown as { variant?: unknown }).variant;
  if (rawVariant === null || rawVariant === undefined) return undefined;
  const value = String(rawVariant).trim();
  return value === "" ? undefined : value;
}
