import { romanize, wrapItem } from "./util";
import type { Issue, Publisher, RouteParams, SelectedRoot, Series } from "../types/domain";

export const HierarchyLevel = Object.freeze({
  ROOT: "ROOT",
  PUBLISHER: "PUBLISHER",
  SERIES: "SERIES",
  ISSUE: "ISSUE",
});

export type HierarchyLevelType = (typeof HierarchyLevel)[keyof typeof HierarchyLevel];

function safeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

export function getHierarchyLevel(item: SelectedRoot): HierarchyLevelType {
  if (item.publisher) return HierarchyLevel.PUBLISHER;
  if (item.series) return HierarchyLevel.SERIES;
  if (item.issue) return HierarchyLevel.ISSUE;
  return HierarchyLevel.ROOT;
}

export function generateUrl(item: SelectedRoot, us: boolean): string {
  if (hasTypename(item)) item = wrapItem(item);

  const url = us ? "/us/" : "/de/";

  if (!item.publisher && !item.series && !item.issue) return url;

  if (item.publisher)
    return url + encodeURIComponent(safeValue(item.publisher.name).replace(/%/g, "%25"));

  if (item.series) {
    const publisherName = safeValue(item.series.publisher?.name).replace(/%/g, "%25");
    const seriesTitle = safeValue(item.series.title).replace(/%/g, "%25");
    const volume = safeValue(item.series.volume);
    return (
      url +
      encodeURIComponent(publisherName) +
      "/" +
      encodeURIComponent(seriesTitle + "_Vol_" + volume)
    );
  }

  if (!item.issue?.variant || item.issue.variant === "") {
    const publisherName = safeValue(item.issue?.series?.publisher?.name).replace(/%/g, "%25");
    const seriesTitle = safeValue(item.issue?.series?.title).replace(/%/g, "%25");
    const seriesVolume = safeValue(item.issue?.series?.volume);
    const number = safeValue(item.issue?.number).replace(/%/g, "%25");
    const format = safeValue(item.issue?.format);
    return (
      url +
      encodeURIComponent(publisherName) +
      "/" +
      encodeURIComponent(seriesTitle + "_Vol_" + seriesVolume) +
      "/" +
      encodeURIComponent(number) +
      (format ? "/" + encodeURIComponent(format) : "")
    );
  }

  const publisherName = safeValue(item.issue?.series?.publisher?.name).replace(/%/g, "%25");
  const seriesTitle = safeValue(item.issue?.series?.title).replace(/%/g, "%25");
  const seriesVolume = safeValue(item.issue?.series?.volume);
  const number = safeValue(item.issue?.number).replace(/%/g, "%25");
  const format = safeValue(item.issue?.format);
  const variant = safeValue(item.issue?.variant);

  return (
    url +
    encodeURIComponent(publisherName) +
    "/" +
    encodeURIComponent(seriesTitle + "_Vol_" + seriesVolume) +
    "/" +
    encodeURIComponent(number) +
    "/" +
    encodeURIComponent(format + "_" + variant)
  );
}

export function getSelected(params: RouteParams, us: boolean): SelectedRoot {
  const selected: SelectedRoot = { us };

  if (params.publisher) {
    selected.publisher = { name: decodeURIComponent(params.publisher) };
  }

  if (params.series) {
    const seriesValue = decodeURIComponent(params.series);
    const volumeSeparator = "_Vol_";
    const separatorIndex = seriesValue.lastIndexOf(volumeSeparator);
    const hasSeparator = separatorIndex > -1;
    const legacySeparatorIndex = seriesValue.lastIndexOf("_");
    const hasLegacySeparator = !hasSeparator && legacySeparatorIndex > -1;
    const title = hasSeparator
      ? seriesValue.substring(0, separatorIndex)
      : hasLegacySeparator
        ? seriesValue.substring(0, legacySeparatorIndex)
        : seriesValue;
    const volumeText = hasSeparator
      ? seriesValue.substring(separatorIndex + volumeSeparator.length)
      : hasLegacySeparator
        ? seriesValue.substring(legacySeparatorIndex + 1)
        : "1";
    const parsedVolume = Number.parseInt(volumeText, 10);
    const volume = Number.isFinite(parsedVolume) ? parsedVolume : undefined;

    selected.series = {
      title,
      volume,
      publisher: { name: selected.publisher?.name || "" },
    };
    selected.publisher = undefined;
  }

  if (params.issue && selected.series) {
    selected.issue = {
      number: decodeURIComponent(params.issue),
      series: {
        title: selected.series.title,
        volume: selected.series.volume,
        publisher: { name: selected.series.publisher.name },
      },
    };
    selected.series = undefined;
  }

  if (params.variant && selected.issue) {
    const variant = decodeURIComponent(params.variant);
    const separatorIndex = variant.indexOf("_");
    if (separatorIndex > -1) {
      selected.issue.format = variant.substring(0, separatorIndex);
      selected.issue.variant = variant.substring(separatorIndex + 1);
    } else {
      selected.issue.format = variant;
    }
  }

  return selected;
}

export function generateLabel(item?: SelectedRoot | null): string {
  if (!item) return "";

  if (hasTypename(item)) item = wrapItem(item);

  if (!item.publisher && !item.series && !item.issue) {
    return "Shortbox - Das deutsche Archiv für Marvel Comics";
  }

  if (item.publisher) return safeValue(item.publisher.name);

  if (item.series) {
    let year = "";
    if (item.series.startyear) year = " (" + item.series.startyear + ")";
    const title = safeValue(item.series.title);
    const volume = item.series.volume;
    const hasVolume = volume !== undefined && volume !== null;
    return (
      title + (item.series.publisher && hasVolume ? " (Vol. " + romanize(volume) + ")" + year : "")
    );
  }

  if (item.issue) {
    let year = "";
    if (item.issue.series.startyear) year = " (" + item.issue.series.startyear + ")";
    const title = safeValue(item.issue.series.title);
    const volume = item.issue.series.volume;
    const hasVolume = volume !== undefined && volume !== null;

    const legacyNumber = safeValue((item.issue as Issue).legacy_number).trim();

    return (
      title +
      (item.issue.series.publisher && hasVolume ? " (Vol. " + romanize(volume) + ")" : "") +
      (year || "") +
      " #" +
      safeValue(item.issue.number) +
      (legacyNumber ? " LGY #" + legacyNumber : "")
    );
  }

  return "";
}

function hasTypename(
  item: SelectedRoot | Publisher | Series | Issue
): item is Publisher | Series | Issue {
  return !!item && typeof item === "object" && "__typename" in item && Boolean(item.__typename);
}
