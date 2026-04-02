import { HierarchyLevel } from "../../../../lib/routes/hierarchy";
import { stripItem } from "../../../../util/util";
import { createEmptyIssueValues } from "./constants";
import type { IssueEditorFormValues } from "./types";
import { ensureFieldItemClientId } from "../issue-sections/defaults";

function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

function normalizeSeries(series: Record<string, unknown> | undefined, fallbackUs = false) {
  if (!series) return createEmptyIssueValues().series;

  const publisher = (series.publisher || {}) as { name?: string; us?: boolean };
  return {
    title: String(series.title || ""),
    volume: (series.volume as number | string) || 0,
    publisher: {
      name: String(publisher.name || ""),
      us: typeof publisher.us === "boolean" ? publisher.us : fallbackUs,
    },
  };
}

function normalizeStory(story: Record<string, unknown>, usIssue: boolean) {
  const parent = (story.parent || {}) as {
    number?: number;
    title?: string;
    issue?: {
      number?: string;
      legacy_number?: string;
      series?: { title?: string; volume?: number; startyear?: number };
    };
  };
  const parentIssue = parent.issue || {};
  const parentSeries = parentIssue.series || {};
  const exclusive = Boolean(story.exclusive || usIssue);

  return ensureFieldItemClientId({
    id: story.id,
    _id: story._id,
    uuid: story.uuid,
    title: String(story.title || ""),
    number: story.number,
    addinfo: String(story.addinfo || ""),
    part: String(story.part || ""),
    exclusive,
    individuals:
      !exclusive && !story.individuals
        ? undefined
        : asArray(story.individuals as Array<Record<string, unknown>>).map((entry) =>
            stripItem(entry)
          ),
    appearances:
      !exclusive && !story.individuals
        ? undefined
        : asArray(story.appearances as Array<Record<string, unknown>>).map((entry) =>
            stripItem(entry)
          ),
    parent: exclusive
      ? undefined
      : {
          number: parent.number || 0,
          title: String(parent.title || ""),
          issue: {
            series: {
              title: String(parentSeries.title || ""),
              volume: parentSeries.volume || 0,
              startyear: parentSeries.startyear || undefined,
            },
            number: String(parentIssue.number || ""),
            legacy_number: String(parentIssue.legacy_number || ""),
          },
        },
    children: story.children,
  });
}

export function buildIssueCreateDefaultValues(
  selected?: Record<string, unknown>,
  level?: string
): IssueEditorFormValues {
  const defaults = createEmptyIssueValues();

  if (!selected) return defaults;
  const selectedUs = Boolean((selected as { us?: boolean }).us);
  defaults.series.publisher.us = selectedUs;

  if (level === HierarchyLevel.PUBLISHER) {
    const selectedPublisher = (selected.publisher || {}) as { name?: string; us?: boolean };
    defaults.series.publisher = {
      name: String(selectedPublisher.name || ""),
      us: typeof selectedPublisher.us === "boolean" ? selectedPublisher.us : selectedUs,
    };
  } else if (level === HierarchyLevel.SERIES) {
    defaults.series = normalizeSeries(
      selected.series as Record<string, unknown> | undefined,
      selectedUs
    );
  } else if (level === HierarchyLevel.ISSUE) {
    defaults.series = normalizeSeries(
      ((selected.issue as { series?: Record<string, unknown> }) || {}).series,
      selectedUs
    );
  }

  return defaults;
}

export function mapIssueToEditorDefaultValues(
  issueData: Record<string, unknown>,
  copyMode: boolean
): IssueEditorFormValues {
  const values = deepClone(issueData || {});
  const defaults = createEmptyIssueValues();
  const series = normalizeSeries(values.series as Record<string, unknown> | undefined);
  const usIssue = Boolean(series.publisher.us);

  const merged: IssueEditorFormValues = {
    ...defaults,
    ...values,
    series,
    cover: values.cover || "",
    pages: Number(values.pages || 0),
    comicguideid: Number(values.comicguideid || 0),
    isbn: String(values.isbn || ""),
    limitation: String(values.limitation || ""),
    individuals: asArray(values.individuals as Array<Record<string, unknown>>).map(
      (individual) => ({
        name: individual.name,
        type: individual.type,
      })
    ),
    arcs: asArray(values.arcs as Array<Record<string, unknown>>).map((arc) => ({
      title: arc.title,
      type: arc.type,
    })),
    stories: asArray(values.stories as Array<Record<string, unknown>>).map((story) =>
      normalizeStory(story, usIssue)
    ),
  };

  if (!copyMode) {
    const normalized: IssueEditorFormValues = { ...merged };
    if (values.releasedate == null) normalized.releasedate = "";
    if (values.price == null) normalized.price = "";
    if (values.currency == null) normalized.currency = "";
    if (values.pages == null) normalized.pages = undefined;
    if (values.comicguideid == null) normalized.comicguideid = undefined;
    if (values.limitation == null) normalized.limitation = "";
    if (values.isbn == null) normalized.isbn = "";
    if (values.addinfo == null) normalized.addinfo = "";
    if (values.title == null) normalized.title = "";
    if (values.format == null) normalized.format = "";
    if (values.variant == null) normalized.variant = "";
    return normalized;
  }

  return {
    ...merged,
    variant: "",
    isbn: "",
    stories: [],
    individuals: [],
    arcs: [],
    cover: undefined,
    copyBatch: {
      enabled: false,
      count: 1,
      prefix: "",
    },
  };
}
