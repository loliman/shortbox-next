import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

type ParsedSearchPattern = {
  raw: string;
  title: string;
  volume?: number;
  year?: number;
  issueNumber?: string;
};

type SearchIndexRow = {
  node_type: "publisher" | "series" | "issue";
  label: string;
  url: string;
  publisher_name: string | null;
  series_title: string | null;
  series_volume: number | null;
  series_startyear: number | null;
  series_endyear: number | null;
  issue_number: string | null;
  issue_legacy_number: string | null;
  issue_format: string | null;
  issue_variant: string | null;
  issue_title: string | null;
  ts_rank: number | null;
  trigram_rank: number | null;
};

type NodeCandidate = {
  type: "publisher" | "series" | "issue";
  label: string;
  url: string;
  relevance: number;
  seriesTitleSort?: string;
  seriesVolumeSort?: number;
  issueNumberSort?: string;
  issueFormatSort?: string;
  issueVariantSort?: string;
  seriesKey?: string;
};

type PublicSearchNode = {
  type: string;
  label: string;
  url: string;
};

const SEARCH_RESULT_LIMIT = 20;
const SEARCH_POOL_LIMIT = 500;
const SEARCH_TYPE_POOL_LIMITS = {
  series: 250,
  issue: 900,
  publisher: 120,
} as const;

const FRACTION_NUMBER_PATTERN = /^(-?\d+)\s*\/\s*(\d+)$/;
const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:[.,]\d+)?$/;
const UNICODE_FRACTION_VALUES: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
};

export async function findPublicSearchNodes(input: {
  pattern: string;
  us: boolean;
  offset?: number;
}): Promise<PublicSearchNode[]> {
  const pattern = readSearchText(input.pattern);
  if (!pattern) return [];

  const parsed = parseSearchPattern(pattern);
  const primaryRows = await runSearchQuery(parsed.raw, input.us);
  let rows = primaryRows;

  if (parsed.issueNumber) {
    const seriesScopedRaw = buildSeriesScopedRaw(parsed);
    if (seriesScopedRaw && seriesScopedRaw !== parsed.raw) {
      const extraRows = await runSearchQuery(seriesScopedRaw, input.us);
      const deduped = new Map<string, SearchIndexRow>();
      for (const row of [...primaryRows, ...extraRows]) {
        const key = `${row.node_type}::${row.url}::${row.label}`;
        if (!deduped.has(key)) deduped.set(key, row);
      }
      rows = [...deduped.values()];
    }
  }

  const candidates = rows
    .map((row) => toCandidate(row, parsed))
    .filter((candidate): candidate is NodeCandidate => Boolean(candidate));

  const balanced = buildSeriesFirstBlocks(candidates, {
    maxSeries: 12,
    maxIssues: 20,
    maxAdditionalIssuesPerSeries: 5,
    maxPublishers: 6,
    titleQuery: parsed.title || parsed.raw,
    volumeQuery: parsed.volume,
    issueNumberQuery: parsed.issueNumber,
  });

  const start = Number.isFinite(input.offset) && input.offset && input.offset > 0 ? input.offset : 0;
  return balanced.slice(start, start + SEARCH_RESULT_LIMIT).map((node) => ({
    type: node.type,
    label: node.label,
    url: node.url,
  }));
}

async function runSearchQuery(rawQuery: string, us: boolean) {
  const likePattern = `%${normalizeForSearch(rawQuery).replaceAll(/\s+/g, "%")}%`;

  return prisma.$queryRaw<SearchIndexRow[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        si.node_type,
        si.label,
        si.url,
        si.publisher_name,
        si.series_title,
        si.series_volume,
        si.series_startyear,
        si.series_endyear,
        si.issue_number,
        i.legacy_number AS issue_legacy_number,
        si.issue_format,
        si.issue_variant,
        si.issue_title,
        ts_rank_cd(
          si.search_tsv,
          websearch_to_tsquery('simple', unaccent(CAST(${rawQuery} AS text)))
        ) AS ts_rank,
        similarity(si.search_text, unaccent(CAST(${rawQuery} AS text))) AS trigram_rank,
        ROW_NUMBER() OVER (
          PARTITION BY si.node_type
          ORDER BY
            ts_rank_cd(
              si.search_tsv,
              websearch_to_tsquery('simple', unaccent(CAST(${rawQuery} AS text)))
            ) DESC,
            similarity(si.search_text, unaccent(CAST(${rawQuery} AS text))) DESC,
            si.label ASC
        ) AS type_rank
      FROM shortbox.search_index si
      LEFT JOIN shortbox.issue i
        ON si.node_type = 'issue'
       AND i.id = si.source_id
      WHERE si.us = CAST(${us} AS boolean)
        AND (
          si.search_tsv @@ websearch_to_tsquery('simple', unaccent(CAST(${rawQuery} AS text)))
          OR si.search_text ILIKE CAST(${likePattern} AS text)
        )
    )
    SELECT
      node_type,
      label,
      url,
      publisher_name,
      series_title,
      series_volume,
      series_startyear,
      series_endyear,
      issue_number,
      issue_legacy_number,
      issue_format,
      issue_variant,
      issue_title,
      ts_rank,
      trigram_rank
    FROM ranked
    WHERE
      (node_type = 'series' AND type_rank <= CAST(${SEARCH_TYPE_POOL_LIMITS.series} AS integer))
      OR (node_type = 'issue' AND type_rank <= CAST(${SEARCH_TYPE_POOL_LIMITS.issue} AS integer))
      OR (node_type = 'publisher' AND type_rank <= CAST(${SEARCH_TYPE_POOL_LIMITS.publisher} AS integer))
    ORDER BY ts_rank DESC, trigram_rank DESC, label ASC
    LIMIT CAST(${SEARCH_POOL_LIMIT} AS integer)
  `);
}

function readCandidateContext(row: SearchIndexRow, parsed: ParsedSearchPattern) {
  return {
    seriesTitle: normalizeForSearch(row.series_title || ""),
    normalizedTitlePattern: normalizeForSearch(parsed.title || parsed.raw),
    issueNumber: (row.issue_number || "").trim(),
    issueLegacyNumber: (row.issue_legacy_number || "").trim(),
    issueVariant: (row.issue_variant || "").trim(),
  };
}

function matchesParsedSeries(row: SearchIndexRow, parsed: ParsedSearchPattern): boolean {
  if (parsed.volume != null && Number(row.series_volume || 0) !== parsed.volume) return false;
  if (parsed.year != null && !isYearMatch(row.series_startyear, row.series_endyear, parsed.year)) {
    return false;
  }
  return true;
}

function matchesParsedIssue(
  row: SearchIndexRow,
  parsed: ParsedSearchPattern,
  context: ReturnType<typeof readCandidateContext>
): boolean {
  if (
    parsed.issueNumber &&
    !normalizeForSearch(context.issueNumber).startsWith(normalizeForSearch(parsed.issueNumber)) &&
    !normalizeForSearch(context.issueLegacyNumber).startsWith(normalizeForSearch(parsed.issueNumber))
  ) {
    return false;
  }

  if (!matchesParsedSeries(row, parsed)) return false;

  if (
    hasStructuredQualifier(parsed) &&
    context.normalizedTitlePattern &&
    !context.seriesTitle.includes(context.normalizedTitlePattern)
  ) {
    return false;
  }

  return true;
}

function scoreSeriesCandidate(
  row: SearchIndexRow,
  parsed: ParsedSearchPattern,
  context: ReturnType<typeof readCandidateContext>,
  baseRelevance: number
) {
  let relevance = baseRelevance;

  if (context.normalizedTitlePattern && context.seriesTitle.includes(context.normalizedTitlePattern)) {
    relevance += 240;
  }
  if (parsed.volume != null && Number(row.series_volume || 0) === parsed.volume) relevance += 200;
  if (parsed.year != null && isYearMatch(row.series_startyear, row.series_endyear, parsed.year)) {
    relevance += 180;
  }

  return (
    relevance +
    scoreIdentityBonus(
      `${row.series_title || ""} vol ${row.series_volume || ""} ${row.series_startyear || ""}`,
      parsed.raw
    )
  );
}

function scoreIssueCandidate(
  row: SearchIndexRow,
  parsed: ParsedSearchPattern,
  context: ReturnType<typeof readCandidateContext>,
  baseRelevance: number
) {
  let relevance = baseRelevance;

  if (
    context.normalizedTitlePattern &&
    (normalizeForSearch(row.issue_title || "").includes(context.normalizedTitlePattern) ||
      context.seriesTitle.includes(context.normalizedTitlePattern))
  ) {
    relevance += 220;
  }
  if (parsed.volume != null && Number(row.series_volume || 0) === parsed.volume) relevance += 180;
  if (parsed.year != null && isYearMatch(row.series_startyear, row.series_endyear, parsed.year)) {
    relevance += 170;
  }
  if (
    parsed.issueNumber &&
    (normalizeForSearch(context.issueNumber).startsWith(normalizeForSearch(parsed.issueNumber)) ||
      normalizeForSearch(context.issueLegacyNumber).startsWith(normalizeForSearch(parsed.issueNumber)))
  ) {
    relevance += 210;
  }

  return (
    relevance +
    scoreIdentityBonus(
      `${row.series_title || ""} vol ${row.series_volume || ""} ${row.series_startyear || ""} ${row.issue_number || ""} ${row.issue_legacy_number || ""} ${row.issue_format || ""} ${row.issue_variant || ""}`,
      parsed.raw
    )
  );
}

function toCandidate(row: SearchIndexRow, parsed: ParsedSearchPattern): NodeCandidate | null {
  const type = row.node_type;
  if (type !== "publisher" && type !== "series" && type !== "issue") return null;

  const context = readCandidateContext(row, parsed);

  const baseRelevance =
    Number(row.ts_rank || 0) * 1000 +
    Number(row.trigram_rank || 0) * 300 +
    scoreStringMatch(row.label, parsed.raw);

  if (type === "issue" && !matchesParsedIssue(row, parsed, context)) return null;
  if (type === "series" && !matchesParsedSeries(row, parsed)) return null;

  let relevance = baseRelevance;
  if (type === "series") {
    relevance = scoreSeriesCandidate(row, parsed, context, baseRelevance);
  } else if (type === "issue") {
    relevance = scoreIssueCandidate(row, parsed, context, baseRelevance);
  }

  return {
    type,
    label: type === "issue" ? buildIssueDisplayLabel(row) : row.label,
    url: row.url,
    relevance,
    seriesTitleSort: row.series_title || "",
    seriesVolumeSort: Number(row.series_volume || 0),
    issueNumberSort: context.issueNumber,
    issueFormatSort: row.issue_format || "",
    issueVariantSort: context.issueVariant,
    seriesKey: `${row.publisher_name || ""}::${row.series_title || ""}::${row.series_volume || ""}::${row.series_startyear || ""}`,
  };
}

function parseSearchPattern(input: string): ParsedSearchPattern {
  const raw = input.trim();
  const tokens = raw
    .split(/\s+/)
    .map((token) => cleanSearchToken(token))
    .filter((token) => token.length > 0);
  const rest = [...tokens];
  let issueNumber: string | undefined;
  let volume: number | undefined;
  let year: number | undefined;

  for (let idx = 0; idx < rest.length - 1; idx += 1) {
    const marker = rest[idx]?.toLowerCase();
    if (marker !== "vol" && marker !== "volume" && marker !== "v") continue;
    const parsedVolume = parsePositiveInt(rest[idx + 1]);
    if (parsedVolume == null) continue;
    volume = parsedVolume;
    rest.splice(idx, 2);
    break;
  }

  for (let idx = rest.length - 1; idx >= 0; idx -= 1) {
    const parsedYear = parseYear(rest[idx]);
    if (parsedYear == null) continue;
    year = parsedYear;
    rest.splice(idx, 1);
    break;
  }

  const trailingIssue = rest.at(-1);
  if (rest.length > 1 && trailingIssue && looksLikeIssueNumberToken(trailingIssue)) {
    issueNumber = trailingIssue;
    rest.pop();
  }

  return {
    raw,
    title: rest.join(" ").trim(),
    volume,
    year,
    issueNumber,
  };
}

function cleanSearchToken(token: string): string {
  const trimmed = token.trim();
  let start = 0;
  let end = trimmed.length;

  while (start < end && isSearchNoiseCharacter(trimmed[start], false)) {
    start += 1;
  }

  while (end > start && isSearchNoiseCharacter(trimmed[end - 1], true)) {
    end -= 1;
  }

  return trimmed.slice(start, end);
}

function isSearchNoiseCharacter(char: string | undefined, allowSlash: boolean): boolean {
  if (!char) return false;
  if (/[0-9a-zA-Z]/.test(char)) return false;
  return allowSlash ? char !== "/" : true;
}

function hasStructuredQualifier(parsed: ParsedSearchPattern): boolean {
  return parsed.volume != null || parsed.year != null || Boolean(parsed.issueNumber);
}

function looksLikeIssueNumberToken(token: string): boolean {
  return /^\d+(?:[A-Za-z]|\/\d+)?$/.test(token);
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseYear(value: string | undefined): number | null {
  const parsed = parsePositiveInt(value);
  if (parsed == null) return null;
  return parsed >= 1800 && parsed <= 2200 ? parsed : null;
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^0-9a-z]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function scoreStringMatch(label: string, rawPattern: string): number {
  const normalizedLabel = normalizeForSearch(label);
  const normalizedPattern = normalizeForSearch(rawPattern);
  if (!normalizedPattern) return 0;

  let score = 0;
  if (normalizedLabel === normalizedPattern) score += 320;
  else if (normalizedLabel.startsWith(normalizedPattern)) score += 180;
  else if (normalizedLabel.includes(normalizedPattern)) score += 90;

  for (const token of normalizedPattern.split(/\s+/).filter(Boolean)) {
    if (normalizedLabel.includes(token)) score += 18;
  }

  return score;
}

function scoreIdentityBonus(identity: string, rawPattern: string): number {
  const normalizedIdentity = normalizeForSearch(identity);
  const normalizedPattern = normalizeForSearch(rawPattern);
  if (!normalizedPattern) return 0;
  if (normalizedIdentity === normalizedPattern) return 600;
  if (normalizedIdentity.startsWith(normalizedPattern)) return 360;
  if (normalizedIdentity.includes(normalizedPattern)) return 180;
  return 0;
}

function isYearMatch(startyear: number | null, endyear: number | null, year: number): boolean {
  const start = Number(startyear || 0);
  const end = Number(endyear || 0);
  if (start === year || end === year) return true;
  if (start > 0 && start <= year) {
    if (end <= 0 || end >= year) return true;
  }
  return false;
}

function parseSortableIssueNumber(value: string): number | null {
  const trimmed = value.trim();
  const unicodeFractionMatch = /^(-?\d+)?\s*([¼½¾])$/.exec(trimmed);
  if (unicodeFractionMatch) {
    const whole = Number(unicodeFractionMatch[1] || 0);
    const fraction = UNICODE_FRACTION_VALUES[unicodeFractionMatch[2]];
    if (Number.isFinite(whole) && fraction != null) return whole + fraction;
  }

  const fractionMatch = FRACTION_NUMBER_PATTERN.exec(trimmed);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
    return null;
  }

  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function compareIssueNumberForSort(leftRaw: string, rightRaw: string): number {
  const leftSortable = parseSortableIssueNumber(leftRaw);
  const rightSortable = parseSortableIssueNumber(rightRaw);
  if (leftSortable != null && rightSortable != null && leftSortable !== rightSortable) {
    return leftSortable - rightSortable;
  }
  return leftRaw.localeCompare(rightRaw, undefined, { numeric: true, sensitivity: "base" });
}

function sortSeriesCandidates(left: NodeCandidate, right: NodeCandidate): number {
  if (left.relevance !== right.relevance) return right.relevance - left.relevance;
  return left.label.localeCompare(right.label);
}

function sortIssueCandidates(left: NodeCandidate, right: NodeCandidate): number {
  const numberCompare = compareIssueNumberForSort(left.issueNumberSort || "", right.issueNumberSort || "");
  if (numberCompare !== 0) return numberCompare;

  if (left.relevance !== right.relevance) return right.relevance - left.relevance;

  const formatCompare = (left.issueFormatSort || "").localeCompare(right.issueFormatSort || "");
  if (formatCompare !== 0) return formatCompare;

  const variantCompare = (left.issueVariantSort || "").localeCompare(right.issueVariantSort || "");
  if (variantCompare !== 0) return variantCompare;

  return left.label.localeCompare(right.label);
}

function sortIssueRepresentatives(left: NodeCandidate, right: NodeCandidate): number {
  const formatCompare = compareIssueFormatPriority(left.issueFormatSort || "", right.issueFormatSort || "");
  if (formatCompare !== 0) return formatCompare;

  const leftVariant = readSearchText(left.issueVariantSort);
  const rightVariant = readSearchText(right.issueVariantSort);
  const leftIsRegular = leftVariant === "";
  const rightIsRegular = rightVariant === "";
  if (leftIsRegular !== rightIsRegular) return leftIsRegular ? -1 : 1;

  const variantCompare = leftVariant.localeCompare(rightVariant, undefined, { sensitivity: "base" });
  if (variantCompare !== 0) return variantCompare;

  if (left.relevance !== right.relevance) return right.relevance - left.relevance;
  return left.label.localeCompare(right.label);
}

function compareIssueFormatPriority(leftFormat: string, rightFormat: string): number {
  return issueFormatPriority(leftFormat) - issueFormatPriority(rightFormat);
}

function issueFormatPriority(rawFormat: string): number {
  const normalized = normalizeForSearch(rawFormat);
  if (normalized === "heft") return 0;
  if (normalized === "softcover") return 1;
  if (normalized === "hardcover" || normalized === "hc") return 2;
  return 3;
}

function dedupeIssuesBySeriesAndNumber(issues: NodeCandidate[]): NodeCandidate[] {
  const grouped = new Map<string, NodeCandidate[]>();
  for (const issue of issues) {
    const groupKey = `${issue.seriesKey || ""}::${normalizeForSearch(issue.issueNumberSort || "")}`;
    const existing = grouped.get(groupKey);
    if (existing) existing.push(issue);
    else grouped.set(groupKey, [issue]);
  }

  const deduped: NodeCandidate[] = [];
  for (const entries of grouped.values()) {
    entries.sort(sortIssueRepresentatives);
    deduped.push(entries[0]);
  }
  return deduped;
}

function hasExactSeriesMatch(
  node: NodeCandidate,
  normalizedTitleQuery: string,
  volumeQuery?: number
): boolean {
  return (
    normalizedTitleQuery !== "" &&
    volumeQuery != null &&
    normalizeForSearch(node.seriesTitleSort || "") === normalizedTitleQuery &&
    Number(node.seriesVolumeSort || 0) === Number(volumeQuery)
  );
}

function buildIssuesBySeries(issues: NodeCandidate[]) {
  const issuesBySeries = new Map<string, NodeCandidate[]>();
  for (const issue of issues) {
    const key = issue.seriesKey || "";
    const grouped = issuesBySeries.get(key);
    if (grouped) grouped.push(issue);
    else issuesBySeries.set(key, [issue]);
  }
  for (const grouped of issuesBySeries.values()) {
    grouped.sort(sortIssueCandidates);
  }
  return issuesBySeries;
}

function pickBestIssueForSeries(
  groupedIssues: NodeCandidate[],
  normalizedIssueNumberQuery: string
) {
  if (groupedIssues.length === 0) return undefined;

  return [...groupedIssues].sort((left, right) => {
    const leftExactNumber =
      normalizedIssueNumberQuery !== "" &&
      normalizeForSearch(left.issueNumberSort || "") === normalizedIssueNumberQuery;
    const rightExactNumber =
      normalizedIssueNumberQuery !== "" &&
      normalizeForSearch(right.issueNumberSort || "") === normalizedIssueNumberQuery;
    if (leftExactNumber !== rightExactNumber) return leftExactNumber ? -1 : 1;
    if (left.relevance !== right.relevance) return right.relevance - left.relevance;
    return sortIssueCandidates(left, right);
  })[0];
}

function appendSeriesIssues(
  result: NodeCandidate[],
  groupedIssues: NodeCandidate[],
  bestMatch: NodeCandidate | undefined,
  consumedIssueKeys: Set<string>,
  counts: { issues: number },
  limits: { maxIssues: number; maxAdditionalIssuesPerSeries: number }
) {
  if (bestMatch && counts.issues < limits.maxIssues) {
    result.push(bestMatch);
    counts.issues += 1;
    consumedIssueKeys.add(`${bestMatch.url}::${bestMatch.label}`);
  }

  const numericOthers = groupedIssues.filter(
    (issue) => `${issue.url}::${issue.label}` !== `${bestMatch?.url}::${bestMatch?.label}`
  );

  let additionalCount = 0;
  for (const issue of numericOthers) {
    if (additionalCount >= limits.maxAdditionalIssuesPerSeries) break;
    if (counts.issues >= limits.maxIssues) break;
    result.push(issue);
    counts.issues += 1;
    additionalCount += 1;
    consumedIssueKeys.add(`${issue.url}::${issue.label}`);
  }
}

function sortSeriesBlockCandidates(
  nodes: NodeCandidate[],
  normalizedTitleQuery: string,
  volumeQuery?: number
) {
  return nodes.filter((node) => node.type === "series").sort((left, right) => {
    const leftExactSeries = hasExactSeriesMatch(left, normalizedTitleQuery, volumeQuery);
    const rightExactSeries = hasExactSeriesMatch(right, normalizedTitleQuery, volumeQuery);
    if (leftExactSeries !== rightExactSeries) return leftExactSeries ? -1 : 1;
    return sortSeriesCandidates(left, right);
  });
}

function appendRemainingIssues(
  result: NodeCandidate[],
  issues: NodeCandidate[],
  consumedIssueKeys: Set<string>,
  counts: { issues: number },
  maxIssues: number
) {
  if (counts.issues >= maxIssues) return;

  const remainingIssues = issues
    .filter((issue) => !consumedIssueKeys.has(`${issue.url}::${issue.label}`))
    .sort((left, right) => {
      if (left.relevance !== right.relevance) return right.relevance - left.relevance;
      return sortIssueCandidates(left, right);
    });

  for (const issue of remainingIssues) {
    if (counts.issues >= maxIssues) break;
    result.push(issue);
    counts.issues += 1;
  }
}

function appendPublishers(result: NodeCandidate[], publishers: NodeCandidate[], maxPublishers: number) {
  let addedPublishers = 0;
  for (const publisher of publishers) {
    if (addedPublishers >= maxPublishers) break;
    result.push(publisher);
    addedPublishers += 1;
  }
}

function buildSeriesFirstBlocks(
  nodes: NodeCandidate[],
  limits: {
    maxSeries: number;
    maxIssues: number;
    maxAdditionalIssuesPerSeries: number;
    maxPublishers: number;
    titleQuery?: string;
    volumeQuery?: number;
    issueNumberQuery?: string;
  }
) {
  const normalizedTitleQuery = normalizeForSearch(limits.titleQuery || "");
  const normalizedIssueNumberQuery = normalizeForSearch(limits.issueNumberQuery || "");
  const series = sortSeriesBlockCandidates(nodes, normalizedTitleQuery, limits.volumeQuery);
  const issues = dedupeIssuesBySeriesAndNumber(nodes.filter((node) => node.type === "issue"));
  const publishers = nodes.filter((node) => node.type === "publisher").sort(sortSeriesCandidates);
  const issuesBySeries = buildIssuesBySeries(issues);

  const result: NodeCandidate[] = [];
  const counts = { series: 0, issues: 0 };
  const consumedIssueKeys = new Set<string>();

  for (const seriesNode of series) {
    if (counts.series >= limits.maxSeries) break;
    result.push(seriesNode);
    counts.series += 1;

    if (counts.issues >= limits.maxIssues) continue;
    const key = seriesNode.seriesKey || "";
    const groupedIssues = issuesBySeries.get(key) || [];
    if (groupedIssues.length === 0) continue;

    appendSeriesIssues(
      result,
      groupedIssues,
      pickBestIssueForSeries(groupedIssues, normalizedIssueNumberQuery),
      consumedIssueKeys,
      counts,
      {
        maxIssues: limits.maxIssues,
        maxAdditionalIssuesPerSeries: limits.maxAdditionalIssuesPerSeries,
      }
    );
  }

  appendRemainingIssues(result, issues, consumedIssueKeys, counts, limits.maxIssues);
  appendPublishers(result, publishers, limits.maxPublishers);

  return result;
}

function buildSeriesScopedRaw(parsed: ParsedSearchPattern): string {
  const tokens: string[] = [];
  if (parsed.title) tokens.push(parsed.title);
  if (parsed.volume != null) tokens.push("vol", String(parsed.volume));
  if (parsed.year != null) tokens.push(String(parsed.year));
  return tokens.join(" ").trim();
}

function buildIssueDisplayLabel(row: SearchIndexRow): string {
  const sourceLabel = readSearchText(row.label);
  const issueNumber = readSearchText(row.issue_number);
  const issueLegacyNumber = readSearchText(row.issue_legacy_number);
  const issueTitle = readSearchText(row.issue_title);
  if (!sourceLabel || !issueNumber) return sourceLabel;

  const hashIndex = sourceLabel.indexOf(" #");
  const seriesLabel = hashIndex >= 0 ? sourceLabel.slice(0, hashIndex).trim() : sourceLabel;
  const titleSuffix = issueTitle ? `: ${issueTitle}` : "";
  const legacySuffix = issueLegacyNumber ? ` LGY #${issueLegacyNumber}` : "";
  return `${seriesLabel} #${issueNumber}${legacySuffix}${titleSuffix}`;
}

function readSearchText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
