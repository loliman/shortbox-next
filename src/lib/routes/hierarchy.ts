import { romanize, wrapItem } from "../../util/util";
import type { Issue, Publisher, RouteParams, SelectedRoot, Series } from "../../types/domain";
import {
  generatePublisherSlug,
  generateSeriesSlug,
  generateFormatSlug,
  generateVariantSlug,
} from "../slug-builder";
import { parseIssueUrl, parsePublisherSlug, parseSeriesSlug } from "../slug-parser";

export const HierarchyLevel = Object.freeze({
  ROOT: "ROOT",
  PUBLISHER: "PUBLISHER",
  SERIES: "SERIES",
  ISSUE: "ISSUE",
});

export type HierarchyLevelType = (typeof HierarchyLevel)[keyof typeof HierarchyLevel];

function safeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
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
    return url + encodeURIComponent(safeValue(item.publisher.name).replaceAll("%", "%25"));

  if (item.series) {
    const publisherName = safeValue(item.series.publisher?.name).replaceAll("%", "%25");
    const seriesTitle = safeValue(item.series.title).replaceAll("%", "%25");
    const volume = safeValue(item.series.volume);
    return (
      url +
      encodeURIComponent(publisherName) +
      "/" +
      encodeURIComponent(seriesTitle + "_Vol_" + volume)
    );
  }

  if (!item.issue?.variant || item.issue.variant === "") {
    const publisherName = safeValue(item.issue?.series?.publisher?.name).replaceAll("%", "%25");
    const seriesTitle = safeValue(item.issue?.series?.title).replaceAll("%", "%25");
    const seriesVolume = safeValue(item.issue?.series?.volume);
    const number = safeValue(item.issue?.number).replaceAll("%", "%25");
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

  const publisherName = safeValue(item.issue?.series?.publisher?.name).replaceAll("%", "%25");
  const seriesTitle = safeValue(item.issue?.series?.title).replaceAll("%", "%25");
  const seriesVolume = safeValue(item.issue?.series?.volume);
  const number = safeValue(item.issue?.number).replaceAll("%", "%25");
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

export function generateSeoUrl(item: SelectedRoot, us: boolean): string {
  if (hasTypename(item)) item = wrapItem(item);

  const url = us ? "/us/" : "/de/";

  if (!item.publisher && !item.series && !item.issue) return url;

  if (item.publisher) {
    const publisherSlug = generatePublisherSlug(item.publisher.name);
    return url + publisherSlug;
  }

  if (item.series) {
    const publisherSlug = generatePublisherSlug(item.series.publisher?.name);
    const seriesSlug = generateSeriesSlug(
      item.series.title,
      item.series.startyear,
      item.series.volume
    );
    return url + publisherSlug + "/" + seriesSlug;
  }

  if (item.issue) {
    const publisherSlug = generatePublisherSlug(item.issue.series.publisher?.name);
    const seriesSlug = generateSeriesSlug(
      item.issue.series.title,
      item.issue.series.startyear,
      item.issue.series.volume
    );
    const issueNumber = encodeURIComponent(item.issue.number || "");

    let result = url + publisherSlug + "/" + seriesSlug + "/" + issueNumber;

    if (item.issue.format) {
      const formatSlug = generateFormatSlug(item.issue.format);
      result += "/" + formatSlug;

      if (item.issue.variant) {
        const variantSlug = generateVariantSlug(item.issue.variant);
        result += "/" + variantSlug;
      }
    }

    return result;
  }

  return url;
}

function buildSelectedIssueFromParsedIssue(
  parsed: NonNullable<ReturnType<typeof parseIssueUrl>>,
  us: boolean
): SelectedRoot {
  return {
    us,
    issue: {
      number: parsed.issueNumber,
      format: parsed.format,
      variant: parsed.variant,
      series: {
        title: parsed.seriesTitle,
        volume: parsed.seriesVolume,
        startyear: parsed.seriesYear || undefined,
        publisher: { name: parsed.publisherName },
      },
    },
  };
}

function readLegacyIssueRouteParams(
  params: RouteParams,
  hasFormatParam: boolean,
  routeFormat: string,
  routeVariant: string,
  legacyFormatSegment: string,
  hasLegacyVariantSeparator: boolean
) {
  if (!params.publisher || !params.series || !params.issue) return null;

  const legacyPublisher = decodeURIComponent(params.publisher);
  const legacySeries = decodeURIComponent(params.series);
  const legacyIssue = decodeURIComponent(params.issue);
  let formatSlug: string | undefined;
  if (hasFormatParam) formatSlug = routeFormat || undefined;
  else if (legacyFormatSegment && !hasLegacyVariantSeparator) formatSlug = legacyFormatSegment;
  const variantSlug = hasFormatParam ? routeVariant || undefined : undefined;
  const parsed = parseIssueUrl(legacyPublisher, legacySeries, legacyIssue, formatSlug, variantSlug);

  return parsed ? buildSelectedIssueFromParsedIssue(parsed, true) : null;
}

function readLegacySeriesSelection(params: RouteParams, selected: SelectedRoot) {
  if (!params.series) return;

  const seriesValue = decodeURIComponent(params.series);
  const volumeSeparator = "_Vol_";
  const separatorIndex = seriesValue.lastIndexOf(volumeSeparator);
  const hasSeparator = separatorIndex > -1;
  const legacySeparatorIndex = seriesValue.lastIndexOf("_");
  const hasLegacySeparator = !hasSeparator && legacySeparatorIndex > -1;
  let title = seriesValue;
  let volumeText = "1";
  if (hasSeparator) {
    title = seriesValue.substring(0, separatorIndex);
    volumeText = seriesValue.substring(separatorIndex + volumeSeparator.length);
  } else if (hasLegacySeparator) {
    title = seriesValue.substring(0, legacySeparatorIndex);
    volumeText = seriesValue.substring(legacySeparatorIndex + 1);
  }
  const parsedVolume = Number.parseInt(volumeText, 10);

  selected.series = {
    title,
    volume: Number.isFinite(parsedVolume) ? parsedVolume : undefined,
    publisher: { name: selected.publisher?.name || "" },
  };
  selected.publisher = undefined;
}

function applyLegacyIssueSelection(
  selected: SelectedRoot,
  params: RouteParams,
  hasFormatParam: boolean,
  routeFormat: string,
  routeVariant: string,
  legacyFormatSegment: string
) {
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

  if (!selected.issue) return;

  if (hasFormatParam) {
    if (routeFormat) selected.issue.format = routeFormat;
    if (routeVariant) selected.issue.variant = routeVariant;
    return;
  }

  if (!legacyFormatSegment) return;

  const separatorIndex = legacyFormatSegment.indexOf("_");
  if (separatorIndex > -1) {
    selected.issue.format = legacyFormatSegment.substring(0, separatorIndex);
    selected.issue.variant = legacyFormatSegment.substring(separatorIndex + 1);
    return;
  }

  selected.issue.format = legacyFormatSegment;
}

function buildSeriesLabel(item: SelectedRoot["series"]): string {
  const year = item?.startyear ? " (" + item.startyear + ")" : "";
  const title = safeValue(item?.title);
  const volume = item?.volume;
  const hasVolume = volume !== undefined && volume !== null;
  return title + (item?.publisher && hasVolume ? " (Vol. " + romanize(volume) + ")" + year : "");
}

function buildIssueLabel(item: SelectedRoot["issue"]): string {
  if (!item) return "";

  const year = item.series.startyear ? " (" + item.series.startyear + ")" : "";
  const title = safeValue(item.series.title);
  const volume = item.series.volume;
  const hasVolume = volume !== undefined && volume !== null;
  const legacyNumber = safeValue(item.legacy_number).trim();

  return (
    title +
    (item.series.publisher && hasVolume ? " (Vol. " + romanize(volume) + ")" : "") +
    year +
    " #" +
    safeValue(item.number) +
    (legacyNumber ? " LGY #" + legacyNumber : "")
  );
}

function buildParsedLegacySeriesSelection(
  legacyPublisher: string,
  legacySeries: string,
  selected: SelectedRoot
) {
  const parsedPublisher = parsePublisherSlug(legacyPublisher);
  const parsedSeries = parseSeriesSlug(legacySeries);
  if (!parsedPublisher || !parsedSeries) return null;

  return {
    ...selected,
    series: {
      title: parsedSeries.title,
      volume: parsedSeries.volume,
      startyear: parsedSeries.year || undefined,
      publisher: { name: parsedPublisher },
    },
  };
}

function readLegacyRouteContext(params: RouteParams) {
  const legacyPublisher = params.publisher ? decodeURIComponent(params.publisher) : "";
  const legacySeries = params.series ? decodeURIComponent(params.series) : "";
  const legacyIssue = params.issue ? decodeURIComponent(params.issue) : "";
  const hasFormatParam = typeof params.format === "string";
  const routeFormat = params.format ? decodeURIComponent(params.format) : "";
  const routeVariant = params.variant ? decodeURIComponent(params.variant) : "";
  const legacyFormatSegment = hasFormatParam ? "" : routeVariant;

  return {
    legacyPublisher,
    legacySeries,
    legacyIssue,
    hasFormatParam,
    routeFormat,
    routeVariant,
    legacyFormatSegment,
    hasLegacyVariantSeparator: legacyFormatSegment.includes("_"),
  };
}

function readSeoIssueSelection(params: RouteParams, us: boolean) {
  if (!params.publisherSlug || !params.seriesSlug || !params.issueNumber) return null;
  const parsed = parseIssueUrl(
    params.publisherSlug,
    params.seriesSlug,
    params.issueNumber,
    params.formatSlug,
    params.variantSlug
  );
  return parsed ? buildSelectedIssueFromParsedIssue(parsed, us) : null;
}

function readLegacyIssueSelection(params: RouteParams, us: boolean, context: ReturnType<typeof readLegacyRouteContext>) {
  if (!context.legacyPublisher || !context.legacySeries || !context.legacyIssue) return null;
  const parsedIssueSelection = readLegacyIssueRouteParams(
    params,
    context.hasFormatParam,
    context.routeFormat,
    context.routeVariant,
    context.legacyFormatSegment,
    context.hasLegacyVariantSeparator
  );
  return parsedIssueSelection ? { ...parsedIssueSelection, us } : null;
}

export function getSelected(params: RouteParams, us: boolean): SelectedRoot {
  const selected: SelectedRoot = { us };
  const context = readLegacyRouteContext(params);

  const seoIssueSelection = readSeoIssueSelection(params, us);
  if (seoIssueSelection) return seoIssueSelection;

  // Also support SEO slugs on existing dynamic param names
  // (/[publisher]/[series]/[issue]/[format]/[variant]) and legacy
  // (/[publisher]/[series]/[issue]/[variant]) so both formats resolve.
  const legacyIssueSelection = readLegacyIssueSelection(params, us, context);
  if (legacyIssueSelection) return legacyIssueSelection;

  if (context.legacyPublisher && context.legacySeries && !context.legacyIssue) {
    const parsedSeriesSelection = buildParsedLegacySeriesSelection(
      context.legacyPublisher,
      context.legacySeries,
      selected
    );
    if (parsedSeriesSelection) return parsedSeriesSelection;
  }

  if (context.legacyPublisher && !context.legacySeries && !context.legacyIssue) {
    const parsedPublisher = parsePublisherSlug(context.legacyPublisher);
    if (parsedPublisher) {
      selected.publisher = { name: parsedPublisher };
      return selected;
    }
  }

  // Legacy URL structure handling
  if (params.publisher) {
    selected.publisher = { name: decodeURIComponent(params.publisher) };
  }

  readLegacySeriesSelection(params, selected);
  applyLegacyIssueSelection(
    selected,
    params,
    context.hasFormatParam,
    context.routeFormat,
    context.routeVariant,
    context.legacyFormatSegment
  );

  return selected;
}

export function generateLabel(item?: SelectedRoot | null): string {
  if (!item) return "";

  if (hasTypename(item)) item = wrapItem(item);

  if (!item.publisher && !item.series && !item.issue) {
    return "Shortbox - Das deutsche Archiv für Marvel Comics";
  }

  if (item.publisher) return safeValue(item.publisher.name);

  if (item.series) return buildSeriesLabel(item.series);
  if (item.issue) return buildIssueLabel(item.issue);

  return "";
}

function hasTypename(
  item: SelectedRoot | Publisher | Series | Issue
): item is Publisher | Series | Issue {
  return !!item && typeof item === "object" && "__typename" in item && Boolean(item.__typename);
}
