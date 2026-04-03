import type { Issue } from "../../../../types/domain";
import { slugify } from "../../../../lib/slug-builder";

type ArcLike = {
  title?: string | null;
  type?: string | null;
};

export function getTodayLocalDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function collectIssueArcs(issueData: Issue, us: boolean) {
  if (us) {
    return (issueData.arcs || [])
      .filter((arc): arc is ArcLike => Boolean(arc?.title))
      .map((arc) => ({
        title: arc.title || "",
        type: arc.type || "STORYARC",
      }));
  }

  const deduped = new Map<string, { title: string; type: string }>();
  for (const story of issueData.stories || []) {
    for (const arc of story?.parent?.issue?.arcs || []) {
      if (!arc?.title) continue;
      const key = `${arc.type || "STORYARC"}|${arc.title}`;
      if (!deduped.has(key)) {
        deduped.set(key, { title: arc.title, type: arc.type || "STORYARC" });
      }
    }
  }

  return Array.from(deduped.values());
}

export function getContainsItemKey(
  item: { __typename?: string | null; number?: string | number | null },
  idx: number
): string {
  const type = item?.__typename || "item";
  const number = item?.number || String(idx);
  return `${type}|${number}|${idx}`;
}

export function getVariantKey(
  variant: { format?: string | null; variant?: string | null; number?: string | number | null },
  idx: number
): string {
  return `${variant.format || ""}|${variant.variant || ""}|${variant.number || idx}`;
}

export function buildIssueVariantKey(issue: { format?: string | null; variant?: string | null }): string {
  return [slugify(issue.format || ""), slugify(issue.variant || "")].join("|");
}

export function compareIssueNumbers(issueNumber: string, filterNumber: string): number {
  const parseSortableIssueNumber = (value: string): number | null => {
    const trimmed = String(value).trim();
    const unicodeFractionMatch = trimmed.match(/^(-?\d+)?\s*([¼½¾])$/);
    if (unicodeFractionMatch) {
      const whole = Number(unicodeFractionMatch[1] || 0);
      const fractionValues: Record<string, number> = {
        "¼": 0.25,
        "½": 0.5,
        "¾": 0.75,
      };
      const fraction = fractionValues[unicodeFractionMatch[2]];
      if (Number.isFinite(whole) && fraction != null) return whole + fraction;
    }

    const fractionMatch = trimmed.match(/^(-?\d+)\s*\/\s*(\d+)$/);
    if (fractionMatch) {
      const numerator = Number(fractionMatch[1]);
      const denominator = Number(fractionMatch[2]);
      if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
        return numerator / denominator;
      }
      return null;
    }

    if (!/^-?\d+(?:[.,]\d+)?$/.test(trimmed)) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  };

  const issueNumeric = parseSortableIssueNumber(issueNumber);
  const filterNumeric = parseSortableIssueNumber(filterNumber);

  if (issueNumeric != null && filterNumeric != null) {
    return issueNumeric - filterNumeric;
  }

  return String(issueNumber).localeCompare(String(filterNumber), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
