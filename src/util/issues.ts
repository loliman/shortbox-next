import { romanize } from "./util";

type ItemTitleIssueLike = {
  number?: string | number;
  legacy_number?: string | null;
  stories?: unknown[];
  series?: {
    title?: string | null;
    volume?: string | number | null;
    startyear?: string | number | null;
    publisher?: unknown;
  } | null;
  format?: string;
  variant?: string;
};

type ItemTitleParentLike = {
  issue?: ItemTitleIssueLike;
  number?: number;
  format?: string;
  variant?: string;
};

type ItemTitleLike = {
  __typename?: string;
  title?: string;
  number?: string | number;
  parent?: ItemTitleParentLike;
  series?: unknown;
  format?: string;
  variant?: string;
};

function safeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function generateSeriesLabel(series: ItemTitleIssueLike["series"]): string {
  if (!series?.title) return "";

  let year = "";
  if (series.startyear) year = " (" + series.startyear + ")";
  const volume = series.volume;
  const hasVolume = volume !== undefined && volume !== null;

  return (
    safeValue(series.title) +
    (series.publisher && hasVolume ? " (Vol. " + romanize(volume) + ")" + year : "")
  );
}

function generateSelectionLabel(input: {
  series?: ItemTitleIssueLike["series"];
  issue?: ItemTitleIssueLike | null;
}): string {
  if (input.issue) {
    const title = generateSeriesLabel(input.issue.series);
    const legacyNumber = safeValue(input.issue.legacy_number).trim();

    return (
      title +
      " #" +
      safeValue(input.issue.number) +
      (legacyNumber ? " LGY #" + legacyNumber : "")
    );
  }

  return generateSeriesLabel(input.series);
}

function readIssueSeries(series: unknown): ItemTitleIssueLike["series"] {
  if (!series || typeof series !== "object" || Array.isArray(series)) return null;
  return series as ItemTitleIssueLike["series"];
}

export function generateItemTitle(item: ItemTitleLike, us: boolean) {
  let titleFromStory = "";
  if (item.title) titleFromStory = " - " + item.title;

  if (item.parent?.issue) {
    let title =
      generateSelectionLabel({ series: readIssueSeries(item.parent.issue.series) }) +
      " #" +
      safeValue(item.parent.issue.number);
    title +=
      item.__typename !== "Cover" &&
      (item.parent.number || 0) > 0 &&
      (item.parent.issue.stories?.length || 0) > 1
        ? " [" + romanize(item.parent.number ?? 0) + "]"
        : "";
    title += item.parent.variant ? " [" + item.parent.format + "/" + item.parent.variant + "]" : "";
    return title + titleFromStory;
  } else if (item.series) {
    return generateSelectionLabel({ series: readIssueSeries(item.series) }) + " #" + item.number;
  } else if (titleFromStory === "") {
    return us ? "Untitled" : "Exklusiv hier erschienen";
  } else {
    return titleFromStory.substring(3);
  }
}

export function generateIssueSubHeader(item: {
  title?: string | null;
  format?: string | null;
  variant?: string | null;
}) {
  let header = "";

  if (item.title) header += item.title;

  if (item.format) {
    header += " " + item.format;
    if (item.variant) header += " (" + item.variant + " Variant)";
  }
  return header;
}
