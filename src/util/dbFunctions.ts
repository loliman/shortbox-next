import { romanize } from "./util";

const toSafeString = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value) : "";

export const createNodeUrl = (
  type: string,
  original: boolean,
  publisherName: string,
  seriesTitle: string,
  seriesVolume: number,
  number: string,
  format: string,
  variant: string
): string => {
  let url = original ? "/us/" : "/de/";
  url += encodeURIComponent(publisherName);
  if (type !== "publisher") {
    url += `/${encodeURIComponent(seriesTitle)}_Vol_${seriesVolume}`;
    if (type !== "series") {
      url += `/${encodeURIComponent(number)}/${encodeURIComponent(format)}`;
      if (variant) {
        url += `_${encodeURIComponent(variant)}`;
      }
    }
  }
  return url;
};

export const createNodeSeriesLabel = (
  seriesTitle: string,
  publisherName: string,
  volume: number,
  startYear: number,
  endYear: number | null
): string => {
  let years = ` (${startYear}`;
  if (endYear && endYear > startYear) {
    years += `-${endYear}`;
  }
  years += ")";
  return `${seriesTitle} (Vol. ${romanize(volume)})${years} (${publisherName})`;
};

export const createNodeIssueLabel = (
  seriesLabel: string,
  number: string,
  legacyNumber: string,
  format: string,
  variant: string,
  issueTitle: string
): string => {
  let label = `${seriesLabel} #${number}`;
  if (toSafeString(legacyNumber) !== "") {
    label += ` LGY #${toSafeString(legacyNumber)}`;
  }
  let fmt = ` (${format}`;
  if (variant) {
    fmt += `/${variant}`;
  }
  fmt += ")";
  label += fmt;

  if (toSafeString(issueTitle) !== "") {
    label += `: ${toSafeString(issueTitle)}`;
  }
  return label;
};
