import { HierarchyLevel, type HierarchyLevelType } from "../../util/hierarchy";
import type { Connection, QueryCollection } from "../../types/query-data";
import type { SelectedRoot } from "../../types/domain";
import { parseAndNormalizeLegacyFilter } from "../../services/filter/filter-normalization";

type ListNode = Record<string, unknown> & {
  number?: string;
  title?: string;
  volume?: string | number;
  format?: string;
  variant?: string;
  name?: string;
  series?: {
    title?: string;
    volume?: string | number;
    publisher?: { name?: string };
  };
  publisher?: { name?: string };
};

export function parseFilter(filterValue?: string | null) {
  return parseAndNormalizeLegacyFilter(filterValue, {
    mode: "string-only",
    includeRealities: false,
  });
}

export function normalizeListLevelAndSelected(level: HierarchyLevelType, selected: SelectedRoot) {
  if (level === HierarchyLevel.ISSUE) {
    return {
      level: HierarchyLevel.SERIES,
      selected: selected?.issue?.series ? { series: selected.issue.series } : selected?.issue,
    };
  }

  return { level, selected };
}

export function scrollToSelectedIssue(
  data: unknown,
  level: HierarchyLevelType,
  selected: SelectedRoot,
  listElement: HTMLUListElement | null
) {
  if (!level || !selected?.issue?.number || !listElement) return;
  if (level !== HierarchyLevel.SERIES && level !== HierarchyLevel.ISSUE) return;
  const selectedIssueNumber = selected.issue.number;
  const queryName = level === HierarchyLevel.SERIES ? "issueList" : "issueList";
  const items = toNodeList(data, queryName);
  if (!items) return;

  const idx = items.findIndex((entry) => entry?.number === selectedIssueNumber);
  if (idx < 0) return;

  const currentItem = listElement.querySelector(`[data-item-index="${idx}"]`) as HTMLElement | null;
  if (!currentItem) return;

  currentItem.scrollIntoView({
    block: "center",
    inline: "nearest",
  });
}

export function toNodeList(data: unknown, queryName: string): ListNode[] | null {
  const source = data as Record<string, unknown> | null | undefined;
  if (!source?.[queryName]) return null;

  const value = source[queryName];
  if (Array.isArray(value)) return value as ListNode[];
  if (isConnection(value)) {
    const connection = value as Connection<ListNode>;
    return connection.edges.map((edge) => edge?.node).filter(Boolean) as ListNode[];
  }

  return null;
}

export function getItemKey(item: ListNode, fallbackIndex: number): string {
  if (
    item?.number &&
    item?.series?.title &&
    item?.series?.volume &&
    item?.series?.publisher?.name
  ) {
    return [
      "issue",
      item.series.publisher.name,
      item.series.title,
      item.series.volume,
      item.number,
      item.format || "",
      item.variant || "",
    ].join("|");
  }

  if (item?.title && item?.volume && item?.publisher?.name) {
    return ["series", item.publisher.name, item.title, item.volume].join("|");
  }

  if (item?.name) {
    return ["publisher", item.name].join("|");
  }

  return "entry|" + fallbackIndex;
}

function isConnection(value: unknown): value is Connection<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "edges" in value &&
    "pageInfo" in value
  );
}
