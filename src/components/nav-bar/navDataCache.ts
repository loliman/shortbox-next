import type { IssueNode, SeriesNode } from "./listTreeUtils";

const seriesCache = new Map<string, SeriesNode[]>();
const issueCache = new Map<string, IssueNode[]>();

export function getSeriesCacheKey(navStateKey: string, publisherName: string) {
  return `${navStateKey}|publisher|${publisherName}`;
}

export function getIssueCacheKey(navStateKey: string, seriesKey: string) {
  return `${navStateKey}|series|${seriesKey}`;
}

export function readCachedSeries(navStateKey: string, publisherName: string) {
  return seriesCache.get(getSeriesCacheKey(navStateKey, publisherName));
}

export function writeCachedSeries(
  navStateKey: string,
  publisherName: string,
  seriesNodes: SeriesNode[]
) {
  seriesCache.set(getSeriesCacheKey(navStateKey, publisherName), seriesNodes);
}

export function readCachedIssues(navStateKey: string, seriesKey: string) {
  return issueCache.get(getIssueCacheKey(navStateKey, seriesKey));
}

export function writeCachedIssues(navStateKey: string, seriesKey: string, issueNodes: IssueNode[]) {
  issueCache.set(getIssueCacheKey(navStateKey, seriesKey), issueNodes);
}
