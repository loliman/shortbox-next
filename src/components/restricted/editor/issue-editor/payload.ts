import { stripItem } from "../../../../util/util";
import type { IssueEditorFormValues } from "./types";
import { normalizeIssueCopyBatch, shouldGenerateVariantBatch } from "@/src/util/issue-copy";

interface NamedTypeEntry {
  name?: string;
  type?: string[] | string;
}

interface AppearanceEntry {
  name?: string;
  type?: string;
  role?: string;
}

interface MutationVariables {
  item: Record<string, unknown>;
  batch?: {
    count: number;
    prefix?: string;
  };
}

function toOptionalFloat(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const normalized = readTextValue(value).trim();
  if (normalized.length === 0) return undefined;
  const parsed = typeof value === "number" ? value : Number.parseFloat(normalized.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalInt(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const normalized = readTextValue(value).trim();
  if (normalized.length === 0) return undefined;
  const parsed = typeof value === "number" ? Math.trunc(value) : Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = readTextValue(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toOptionalDateString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString().slice(0, 10);
  }

  const normalized = readTextValue(value).trim();
  if (normalized.length === 0) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is Record<string, unknown> =>
      Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)
  );
}

function normalizeTypeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toOptionalString(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  const single = toOptionalString(value);
  if (!single) return [];
  return [single];
}

function normalizeIndividuals(value: unknown): NamedTypeEntry[] {
  const merged = new Map<string, Set<string>>();

  asRecordArray(value).forEach((entry) => {
    if (entry.pattern) return;

    const name = toOptionalString(entry.name);
    if (!name) return;

    const types = normalizeTypeList(entry.type);
    if (types.length === 0) return;

    const current = merged.get(name) || new Set<string>();
    types.forEach((type) => current.add(type));
    merged.set(name, current);
  });

  return Array.from(merged.entries()).map(([name, typeSet]) => ({
    name,
    type: Array.from(typeSet),
  }));
}

function normalizeAppearances(value: unknown): AppearanceEntry[] {
  const unique = new Set<string>();
  const entries: AppearanceEntry[] = [];

  asRecordArray(value).forEach((entry) => {
    if (entry.pattern) return;

    const name = toOptionalString(entry.name);
    if (!name) return;

    const typeList = normalizeTypeList(entry.type);
    const type = typeList[0] || undefined;
    if (!type) return;

    const roleList = normalizeTypeList(entry.role);
    const role = roleList[0] || undefined;
    const key = `${name}::${type}::${role || ""}`;
    if (unique.has(key)) return;

    unique.add(key);
    entries.push(role ? { name, type, role } : { name, type });
  });

  return entries;
}

function normalizePublisherInput(value: unknown): Record<string, unknown> | undefined {
  const publisher = asRecord(value);
  if (!publisher) return undefined;

  const name = toOptionalString(publisher.name);
  const us = typeof publisher.us === "boolean" ? publisher.us : undefined;

  const normalized: Record<string, unknown> = {};
  if (name) normalized.name = name;
  if (typeof us === "boolean") normalized.us = us;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeSeriesInput(value: unknown): Record<string, unknown> | undefined {
  const series = asRecord(value);
  if (!series) return undefined;

  const normalized: Record<string, unknown> = {};
  const title = toOptionalString(series.title);
  const volume = toOptionalInt(series.volume);
  const publisher = normalizePublisherInput(series.publisher);

  if (title) normalized.title = title;
  if (volume !== undefined) normalized.volume = volume;
  if (publisher) normalized.publisher = publisher;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeIssueReference(value: unknown): Record<string, unknown> | undefined {
  const issue = asRecord(value);
  if (!issue) return undefined;

  const normalized: Record<string, unknown> = {};
  const series = normalizeSeriesInput(issue.series);
  const number = toOptionalString(issue.number);
  const format = toOptionalString(issue.format);
  const variant = toOptionalString(issue.variant);

  if (series) normalized.series = series;
  if (number) normalized.number = number;
  if (format) normalized.format = format;
  if (variant) normalized.variant = variant;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeStoryParent(value: unknown): Record<string, unknown> | undefined {
  const parent = asRecord(value);
  if (!parent) return undefined;

  const normalized: Record<string, unknown> = {};
  const title = toOptionalString(parent.title);
  const number = toOptionalInt(parent.number);
  const issue = normalizeIssueReference(parent.issue);

  if (title) normalized.title = title;
  if (number !== undefined) normalized.number = number;
  if (issue) normalized.issue = issue;
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeStories(value: unknown): Array<Record<string, unknown>> {
  return asRecordArray(value).map((story) => {
    const parent = normalizeStoryParent(story.parent);
    const exclusive = Boolean(story.exclusive) && !parent;

    const normalized: Record<string, unknown> = {
      title: readTextValue(story.title),
      addinfo: readTextValue(story.addinfo),
      part: readTextValue(story.part),
      number: toOptionalInt(story.number) || 0,
      exclusive,
      individuals: normalizeIndividuals(story.individuals),
      appearances: normalizeAppearances(story.appearances),
    };

    if (parent) normalized.parent = parent;

  return normalized;
  });
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

export function buildIssueMutationVariables(
  values: IssueEditorFormValues,
  edit?: boolean,
  issueId?: string | number
): MutationVariables {
  const usIssue = Boolean(values.series.publisher.us);
  const seriesPayload = stripItem(values.series) as Record<string, unknown>;
  seriesPayload.volume = toOptionalInt(values.series.volume);

  const itemPayload = {
    title: toOptionalString(values.title),
    number: toOptionalString(values.number),
    format: toOptionalString(values.format),
    variant: toOptionalString(values.variant),
    releasedate: toOptionalDateString(values.releasedate),
    pages: toOptionalInt(values.pages),
    price: toOptionalFloat(values.price),
    currency: toOptionalString(values.currency),
    isbn: toOptionalString(values.isbn),
    limitation: toOptionalString(values.limitation),
    comicguideid: toOptionalInt(values.comicguideid),
    addinfo: toOptionalString(values.addinfo),
    stories: normalizeStories(values.stories),
    series: seriesPayload,
  } as Record<string, unknown>;

  if (usIssue) {
    itemPayload.format = undefined;
    itemPayload.limitation = undefined;
    itemPayload.pages = undefined;
    itemPayload.comicguideid = undefined;
    itemPayload.isbn = undefined;
    itemPayload.price = undefined;
    itemPayload.currency = undefined;
  }

  const variables: MutationVariables = {
    item: {
      ...itemPayload,
      ...(edit && issueId != null ? { id: issueId } : {}),
    },
  };

  if (!edit && shouldGenerateVariantBatch(values.copyBatch)) {
    const batch = normalizeIssueCopyBatch(values.copyBatch);
    variables.batch = {
      count: batch.count,
      ...(batch.prefix ? { prefix: batch.prefix } : {}),
    };
  }

  return variables;
}
