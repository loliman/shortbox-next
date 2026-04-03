import type { PreviewImportDraft, PreviewImportQueue } from "../types/preview-import";

type SeriesMatch = {
  title: string;
  volume: number;
  publisherName: string;
};

export interface PreviewImportSeriesMatchReader {
  findDeSeriesByTitle(title: string): Promise<SeriesMatch[]>;
}

export interface ParsePreviewImportOptions {
  fileName: string;
  text: string;
  seriesReader: PreviewImportSeriesMatchReader;
}

const PRODUCT_CODE_PATTERN = /\b([A-Z]{4,}\d{3,}[A-Z]?)\b/;
const DATE_PATTERN = /\b(\d{2}\.\d{2}\.\d{4})\b/;
const PRICE_PATTERN = /€\s*(\d+(?:,\d{1,2})?|-?\d+),?-/;
const KNOWN_FORMATS = [
  "Heft",
  "Mini Heft",
  "Magazin",
  "Prestige",
  "Softcover",
  "Hardcover",
  "Taschenbuch",
  "Album",
  "Album Hardcover",
] as const;
const TITLE_ACRONYMS = new Set(["HC", "SC", "XL"]);
const ISSUE_NUMBER_PATTERN = /^Nr\.\s*(\d+[A-Z]?)$/i;
const STORY_REFERENCE_PATTERN =
  /^(.*\S)\s+(\d+[A-Z]?|Annual\s+\d+)(?:-(\d+[A-Z]?))?$/i;
const TITLE_LETTER_PATTERN = /[^A-Za-zÄÖÜäöüß]/g;
const TITLE_UPPERCASE_PATTERN = /[^A-ZÄÖÜ]/g;

export async function parsePreviewImportQueue(
  options: ParsePreviewImportOptions
): Promise<PreviewImportQueue> {
  const lines = normalizeLines(options.text);
  const blocks = splitPreviewBlocks(lines);
  const blockDrafts = (
    await Promise.all(blocks.map((block, index) => parseBlockToDrafts(block, index, options.seriesReader)))
  ).flat();
  const codeDrafts = await parseCodeAnchoredDrafts(lines, options.seriesReader, blockDrafts);
  const drafts = dedupeDraftsByIssueCode([...blockDrafts, ...codeDrafts]);

  if (drafts.length === 0) {
    throw new Error("Aus der PDF konnten keine verwertbaren Ausgaben erkannt werden");
  }

  return {
    id: createId("queue"),
    fileName: options.fileName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    drafts,
  };
}

function dedupeDraftsByIssueCode(drafts: PreviewImportDraft[]) {
  const seen = new Set<string>();
  const result: PreviewImportDraft[] = [];

  for (const draft of drafts) {
    const key = readTextValue(draft.issueCode);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    result.push(draft);
  }

  return result;
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean)
    .filter((line) => !isNoiseLine(line));
}

function normalizeLine(line: string) {
  return line
    .replaceAll(/\s+/g, " ")
    .replaceAll(/[‐‑–—]/g, "-")
    .trim();
}

function isNoiseLine(line: string) {
  return (
    line === "" ||
    /^MARVEL ©/i.test(line) ||
    /^N E U H E I T E N$/i.test(line) ||
    /^\d+$/.test(line) ||
    /^COVER FOLGT$/i.test(line)
  );
}

function splitPreviewBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (looksLikeBlockTitle(line) && current.some((entry) => /^Story:/i.test(entry)) && hasMetadataLine(current)) {
      blocks.push(current);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) blocks.push(current);
  return blocks.filter((block) => block.some((line) => /^Story:/i.test(line)) && hasMetadataLine(block));
}

function looksLikeBlockTitle(line: string) {
  if (line.length < 4) return false;
  if (/^Story:/i.test(line) || /^Zeichnungen:/i.test(line) || /^Inhalt:/i.test(line)) return false;
  if (PRODUCT_CODE_PATTERN.test(line)) return false;

  const letters = line.replaceAll(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (letters.length === 0) return false;
  const upperRatio = letters.replaceAll(/[^A-ZÄÖÜ]/g, "").length / letters.length;
  return upperRatio > 0.6;
}

function hasMetadataLine(block: string[]) {
  const storyIndex = block.findIndex((line) => /^Story:/i.test(line));
  if (storyIndex < 0) return false;

  return block.some((line, index) => index > storyIndex && PRODUCT_CODE_PATTERN.test(line));
}

async function parseBlockToDrafts(
  block: string[],
  blockIndex: number,
  seriesReader: PreviewImportSeriesMatchReader
): Promise<PreviewImportDraft[]> {
  const storyIndex = block.findIndex((line) => /^Story:/i.test(line));
  const metadataIndexes = block
    .map((line, index) => ({ line, index }))
    .filter(({ line, index }) => index > storyIndex && PRODUCT_CODE_PATTERN.test(line))
    .map(({ index }) => index);

  if (storyIndex < 0 || metadataIndexes.length === 0) return [];

  const titleLines = extractTitleLines(block, storyIndex);
  const sourceTitle = normalizeTitle(titleLines.join(" "));
  if (!sourceTitle) return [];

  const metadataGroups = metadataIndexes.map((metadataIndex, index) =>
    collectMetadataGroup(
      block,
      metadataIndex,
      index > 0 ? metadataIndexes[index - 1] : storyIndex
    )
  );
  const contentLine = block.find((line) => /^Inhalt:/i.test(line)) ?? "";
  const mainDraft = await buildDraft({
    draftId: createId(`draft-${blockIndex + 1}`),
    sourceTitle,
    metadataLines: metadataGroups[0] ?? [],
    contentLine,
    seriesReader,
    isVariant: false,
  });

  const variantDrafts = await Promise.all(
    metadataGroups.slice(1).map((metadataLines, variantIndex) =>
      buildDraft({
        draftId: createId(`draft-${blockIndex + 1}-variant-${variantIndex + 1}`),
        sourceTitle,
        metadataLines,
        contentLine,
        seriesReader,
        isVariant: true,
        variantOfDraftId: mainDraft.id,
        baseValues: mainDraft.values,
        fallbackReleaseDate: mainDraft.values.releasedate,
      })
    )
  );

  return [mainDraft, ...variantDrafts];
}

async function parseCodeAnchoredDrafts(
  lines: string[],
  seriesReader: PreviewImportSeriesMatchReader,
  existingDrafts: PreviewImportDraft[]
) {
  const existingCodes = new Set(
    existingDrafts
      .map((draft) => readTextValue(draft.issueCode))
      .filter(Boolean)
  );
  const codeIndexes = lines
    .flatMap((line, index) =>
      Array.from(line.matchAll(new RegExp(PRODUCT_CODE_PATTERN.source, "g"))).map((match) => ({
        index,
        code: match[1] ?? "",
      }))
    )
    .filter((entry) => entry.code);

  const drafts: PreviewImportDraft[] = [];

  for (const { index, code } of codeIndexes) {
    if (existingCodes.has(code)) continue;

    const previousCodeIndex = [...codeIndexes].reverse().find((entry) => entry.index < index)?.index ?? -1;
    const windowStart = Math.max(previousCodeIndex + 1, index - 12);
    const windowEnd = Math.min(lines.length, index + 18);
    const windowLines = lines.slice(windowStart, windowEnd);
    const localCodeIndex = index - windowStart;
    const sourceTitle = deriveCodeAnchoredSourceTitle(windowLines, localCodeIndex, code);

    const metadataLines = collectCodeMetadataWindow(windowLines, localCodeIndex);
    const contentLine = windowLines.find((line) => /^Inhalt:/i.test(line)) ?? "";
    const draft = await buildDraft({
      draftId: createId(`code-draft-${code}`),
      sourceTitle,
      metadataLines,
      contentLine,
      seriesReader,
      isVariant: deriveStandaloneVariant(windowLines, localCodeIndex, code),
    });

    draft.issueCode = code;
    applyDerivedIssueIdentity(draft, windowLines, localCodeIndex);

    drafts.push(draft);
  }

  return drafts;
}

async function buildDraft(input: {
  draftId: string;
  sourceTitle: string;
  metadataLines: string[];
  contentLine: string;
  seriesReader: PreviewImportSeriesMatchReader;
  isVariant: boolean;
  variantOfDraftId?: string;
  baseValues?: PreviewImportDraft["values"];
  fallbackReleaseDate?: string;
}): Promise<PreviewImportDraft> {
  const values = input.baseValues ? structuredClone(input.baseValues) : createEmptyIssueValues();
  const warnings: string[] = [];
  const parsedTitle = splitTitleAndNumber(input.sourceTitle);
  const contentReference = parseContentReference(input.contentLine);
  const metadata = parseMetadataLines(input.metadataLines, input.fallbackReleaseDate);

  values.series.publisher.name = "Panini";
  values.series.publisher.us = false;
  values.series.title = parsedTitle.seriesTitle;
  values.series.volume = 1;
  values.number = parsedTitle.number;
  values.title = "";
  values.variant = input.isVariant ? deriveVariantLabel(input.metadataLines.join(" | ")) : "";
  values.pages = metadata.pages ?? values.pages;
  values.format = metadata.format ?? values.format;
  values.price = metadata.price ?? values.price;
  values.currency = "EUR";
  values.releasedate = metadata.releaseDate ?? values.releasedate;
  values.limitation = metadata.limitation ?? values.limitation;

  const matches = await input.seriesReader.findDeSeriesByTitle(parsedTitle.seriesTitle);
  if (matches.length === 1) {
    values.series.title = matches[0].title;
    values.series.volume = matches[0].volume;
    values.series.publisher.name = matches[0].publisherName;
  } else if (matches.length > 1) {
    warnings.push(`Mehrdeutiger Serienmatch für "${parsedTitle.seriesTitle}"`);
  } else {
    warnings.push(`Kein Serienmatch für "${parsedTitle.seriesTitle}" gefunden`);
  }

  if (contentReference) {
    values.stories = contentReference.references.map((reference, index) =>
      ensureFieldItemClientId({
        number: index + 1,
        title: "",
        addinfo: "",
        part: "",
        exclusive: false,
        parent: {
          issue: {
            series: {
              title: reference.seriesTitle,
              volume: reference.volume,
              publisher: {
                name: "",
              },
            },
            number: reference.issueNumber,
          },
          number: 0,
        },
      })
    );
  } else if (input.contentLine) {
    warnings.push("Inhalt konnte nicht in Story-Referenzen umgewandelt werden");
  }

  return {
    id: input.draftId,
    sourceTitle: input.sourceTitle,
    issueCode: metadata.issueCode,
    variantOfDraftId: input.variantOfDraftId ?? null,
    status: "pending",
    warnings,
    values,
  };
}

function splitTitleAndNumber(sourceTitle: string) {
  const cleaned = normalizeTitle(sourceTitle);
  const annualMatch = /^(.*\S)\s+(Annual\s+\d+)$/i.exec(cleaned);
  if (annualMatch) {
    return { seriesTitle: annualMatch[1], number: annualMatch[2] };
  }

  const issueMatch = /^(.*\S)\s+(\d+[A-Za-z]?)$/.exec(cleaned);
  if (issueMatch) {
    return {
      seriesTitle: issueMatch[1],
      number: issueMatch[2],
    };
  }

  return {
    seriesTitle: cleaned,
    number: "1",
  };
}

function normalizeTitle(value: string) {
  const normalized = value.replaceAll(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (!looksMostlyUppercase(normalized)) return normalized;

  return normalized
    .split(/\s+/)
    .map((word) => toTitleCaseWord(word))
    .join(" ");
}

function looksMostlyUppercase(value: string) {
  const letters = value.replaceAll(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (letters.length < 3) return false;

  const upperLetters = letters.replaceAll(/[^A-ZÄÖÜ]/g, "").length;
  return upperLetters / letters.length > 0.6;
}

function toTitleCaseWord(word: string) {
  const hyphenParts = word.split("-");
  return hyphenParts.map((part) => toTitleCasePart(part)).join("-");
}

function toTitleCasePart(part: string) {
  const trimmed = part;
  if (!trimmed) return "";
  if (TITLE_ACRONYMS.has(trimmed)) return trimmed;

  const prefixMatch = readLeadingNonTitleCharacters(trimmed);
  const suffixMatch = readTrailingNonTitleCharacters(trimmed);
  const core = trimmed.slice(prefixMatch.length, trimmed.length - suffixMatch.length);
  if (!core) return trimmed;

  const apostropheSegments = core.split("'");
  const titleCasedCore = apostropheSegments
    .map((segment) => {
      if (!segment) return "";
      const lower = segment.toLocaleLowerCase("de-DE");
      return `${lower.charAt(0).toLocaleUpperCase("de-DE")}${lower.slice(1)}`;
    })
    .join("'");

  return `${prefixMatch}${titleCasedCore}${suffixMatch}`;
}

function deriveCodeAnchoredTitle(lines: string[], localCodeIndex: number) {
  const storyIndex = lines.findIndex((line) => /^Story:/i.test(line));
  if (storyIndex > localCodeIndex) {
    const titleLines = extractTitleLines(lines, storyIndex);
    const title = normalizeTitle(titleLines.join(" "));
    if (title) return title;
  }

  const beforeCode = lines.slice(0, localCodeIndex).reverse();
  const titleLines: string[] = [];
  for (const line of beforeCode) {
    if (!looksLikeStandaloneTitleLine(line)) {
      if (titleLines.length > 0) break;
      continue;
    }
    titleLines.unshift(line);
    if (titleLines.length >= 4) break;
  }

  return normalizeTitle(titleLines.join(" "));
}

function deriveCodeAnchoredSourceTitle(lines: string[], localCodeIndex: number, fallbackCode: string) {
  return deriveCodeAnchoredTitle(lines, localCodeIndex)
    || deriveLooseFallbackTitle(lines, localCodeIndex)
    || fallbackCode;
}

function deriveLooseFallbackTitle(lines: string[], localCodeIndex: number) {
  const candidates = lines
    .slice(Math.max(0, localCodeIndex - 6), localCodeIndex)
    .filter((line) => !isNoiseLine(line))
    .filter((line) => !PRODUCT_CODE_PATTERN.test(line))
    .filter((line) => !DATE_PATTERN.test(line))
    .filter((line) => !PRICE_PATTERN.test(line))
    .filter((line) => !/^(\d+\s*S\.|Nr\.|BAND\s+\d+:)/i.test(line))
    .filter((line) => !/^(Story|Zeichnungen|Inhalt):/i.test(line));

  const best = candidates
    .map((line) => ({
      line,
      score: scoreFallbackTitle(line),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return normalizeTitle(best?.line || "");
}

function scoreFallbackTitle(line: string) {
  const tokens = line.split(/\s+/).filter(Boolean);
  const letters = line.replaceAll(TITLE_LETTER_PATTERN, "").length;
  const shortTokenPenalty = tokens.filter(
    (token) => token.replaceAll(TITLE_LETTER_PATTERN, "").length <= 2
  ).length;
  return letters - shortTokenPenalty * 6;
}

function looksLikeStandaloneTitleLine(line: string) {
  if (!line || isNoiseLine(line)) return false;
  if (PRODUCT_CODE_PATTERN.test(line) || DATE_PATTERN.test(line) || PRICE_PATTERN.test(line)) return false;
  if (/^\d+\s*S\./i.test(line) || /^Nr\./i.test(line) || /^BAND\s+\d+:/i.test(line)) return false;
  if (/^(Story|Zeichnungen|Inhalt):/i.test(line)) return false;
  if (/^©|^TM\b|ALL RIGHTS RESERVED/i.test(line)) return false;

  const tokens = line.split(/\s+/).filter(Boolean);
  const shortTokenRatio = tokens.length > 0
    ? tokens.filter((token) => token.replaceAll(TITLE_LETTER_PATTERN, "").length <= 2).length / tokens.length
    : 1;
  if (shortTokenRatio > 0.45) return false;

  const letters = line.replaceAll(TITLE_LETTER_PATTERN, "");
  if (letters.length < 4) return false;
  const upperRatio = letters.replaceAll(TITLE_UPPERCASE_PATTERN, "").length / letters.length;
  return upperRatio > 0.55;
}

function collectCodeMetadataWindow(lines: string[], localCodeIndex: number) {
  const collected = new Set<string>();
  for (let index = Math.max(0, localCodeIndex - 3); index <= Math.min(lines.length - 1, localCodeIndex + 3); index += 1) {
    const line = lines[index] || "";
    if (!line) continue;
    if (looksLikeMetadataContextLine(line) || index === localCodeIndex) {
      collected.add(line);
    }
  }
  return Array.from(collected);
}

function deriveExplicitIssueNumber(lines: string[], localCodeIndex: number) {
  for (let index = localCodeIndex - 1; index >= Math.max(0, localCodeIndex - 4); index -= 1) {
    const match = ISSUE_NUMBER_PATTERN.exec(lines[index] || "");
    if (match) return match[1];
  }
  return "";
}

function stripTrailingIssueList(value: string) {
  return normalizeTitle(removeTrailingIssueList(value));
}

function deriveBandTitle(lines: string[], localCodeIndex: number) {
  for (let index = localCodeIndex - 1; index >= Math.max(0, localCodeIndex - 5); index -= 1) {
    const bandTitle = extractBandTitle(lines[index] || "");
    if (!bandTitle) continue;

    const sameLineTitle = normalizeTitle(readTextValue(bandTitle).replaceAll(/\(\d{4}\)/g, ""));
    if (sameLineTitle) {
      const split = splitTitleAndNumber(sameLineTitle);
      return {
        seriesTitle: split.seriesTitle,
        number: split.number,
      };
    }
  }

  return null;
}

function applyDerivedIssueIdentity(
  draft: PreviewImportDraft,
  lines: string[],
  localCodeIndex: number
) {
  const explicitNumber = deriveExplicitIssueNumber(lines, localCodeIndex);
  if (explicitNumber) {
    draft.values.number = explicitNumber;
    draft.values.series.title = stripTrailingIssueList(draft.values.series.title);
  }

  const bandTitle = deriveBandTitle(lines, localCodeIndex);
  if (!bandTitle) return;

  draft.values.series.title = bandTitle.seriesTitle;
  draft.values.number = bandTitle.number;
}

function deriveStandaloneVariant(lines: string[], localCodeIndex: number, code: string) {
  const context = lines.slice(Math.max(0, localCodeIndex - 3), Math.min(lines.length, localCodeIndex + 3)).join(" | ");
  return /\bvariant\b/i.test(context) || /\blim\./i.test(context) || /[A-Z]V\d*$/.test(code) || /(?:C|OEX)$/.test(code);
}

function extractTitleLines(block: string[], storyIndex: number) {
  let start = storyIndex;
  while (start - 1 >= 0 && looksLikeBlockTitle(block[start - 1] || "")) {
    start -= 1;
  }

  const directTitleLines = block.slice(start, storyIndex).filter(looksLikeBlockTitle);
  if (directTitleLines.length > 0) return directTitleLines;

  return block.slice(0, storyIndex).filter(looksLikeBlockTitle).slice(-3);
}

function parseContentReference(contentLine: string) {
  if (!contentLine) return null;
  const normalized = contentLine.replace(/^Inhalt:\s*/i, "").trim();
  if (!normalized) return null;

  const references = splitStoryReferenceSegments(normalized)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => parseStoryReferenceSegment(segment));

  return references.length > 0 ? { references } : null;
}

function parseStoryReferenceSegment(segment: string) {
  const match = STORY_REFERENCE_PATTERN.exec(segment);
  if (!match) return [];

  const seriesTitle = match[1].trim();
  const start = match[2].trim();
  const end = match[3]?.trim();

  if (!end) {
    return [{ seriesTitle, volume: 1, issueNumber: start }];
  }

  const startNumber = Number.parseInt(start.replaceAll(/\D/g, ""), 10);
  const endNumber = Number.parseInt(end.replaceAll(/\D/g, ""), 10);
  if (!Number.isFinite(startNumber) || !Number.isFinite(endNumber) || endNumber < startNumber) {
    return [{ seriesTitle, volume: 1, issueNumber: start }];
  }

  return Array.from({ length: endNumber - startNumber + 1 }, (_, offset) => ({
    seriesTitle,
    volume: 1,
    issueNumber: String(startNumber + offset),
  }));
}

function collectMetadataGroup(block: string[], metadataIndex: number, lowerBound: number) {
  let start = metadataIndex;
  while (start - 1 > lowerBound && looksLikeMetadataContextLine(block[start - 1] || "")) {
    start -= 1;
  }

  let end = metadataIndex;
  while (end + 1 < block.length && looksLikeMetadataContextLine(block[end + 1] || "")) {
    end += 1;
  }

  return block.slice(start, end + 1);
}

function looksLikeMetadataContextLine(line: string) {
  return (
    PRODUCT_CODE_PATTERN.test(line) ||
    DATE_PATTERN.test(line) ||
    readPageCount(line) !== undefined ||
    PRICE_PATTERN.test(line) ||
    /\b(?:HC|SC)\b/i.test(line) ||
    /\b(?:Softcover|Hardcover|Heft|Mini Heft|Magazin|Prestige|Taschenbuch|Album)\b/i.test(line) ||
    /\bvariant\b/i.test(line) ||
    /\blim\./i.test(line) ||
    /comic-salon/i.test(line) ||
    /online shop/i.test(line) ||
    /exklusiv/i.test(line)
  );
}

function parseMetadataLines(lines: string[], fallbackReleaseDate?: string) {
  const joined = lines.join(" | ");
  const issueCode = PRODUCT_CODE_PATTERN.exec(joined)?.[1];
  const pages = readPageCount(joined);
  const releaseDate = DATE_PATTERN.exec(joined)?.[1];
  const limitation = /auf\s+(\d+)\s+Ex\./i.exec(joined)?.[1];

  return {
    issueCode,
    pages: pages ? Number.parseInt(pages, 10) : undefined,
    format: parseFormat(joined),
    price: parsePrice(joined),
    releaseDate: resolveIssueReleaseDate(releaseDate, fallbackReleaseDate),
    limitation: limitation || "",
  };
}

function resolveIssueReleaseDate(
  releaseDate: string | undefined,
  fallbackReleaseDate: string | undefined
) {
  if (releaseDate) return toIsoDate(releaseDate);
  if (fallbackReleaseDate && fallbackReleaseDate !== "1900-01-01") return fallbackReleaseDate;
  return undefined;
}

function parseFormat(line: string) {
  if (/\bHC\b/i.test(line)) return "Hardcover";
  if (/\bSC\b/i.test(line)) return "Softcover";
  const known = KNOWN_FORMATS.find((format) =>
    new RegExp(String.raw`\b${escapeRegExp(format)}\b`, "i").test(line)
  );
  return known;
}

function parsePrice(line: string) {
  const match = PRICE_PATTERN.exec(line)?.[1];
  if (!match) return "0";
  return match.replaceAll(",", ".");
}

function toIsoDate(value: string) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return "1900-01-01";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function deriveVariantLabel(line: string) {
  if (/variant/i.test(line)) return "Variant-Cover";
  if (/lim\./i.test(line)) return "Limitiertes Variant-Cover";
  return "Variant-Cover";
}

function escapeRegExp(value: string) {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${createPseudoRandomToken()}`;
}

function readLeadingNonTitleCharacters(value: string) {
  let index = 0;
  while (index < value.length && !isTitleCharacter(value[index])) {
    index += 1;
  }
  return value.slice(0, index);
}

function readTrailingNonTitleCharacters(value: string) {
  let index = value.length - 1;
  while (index >= 0 && !isTitleCharacter(value[index])) {
    index -= 1;
  }
  return value.slice(index + 1);
}

function isTitleCharacter(char: string | undefined) {
  if (!char) return false;
  return /[A-Za-zÄÖÜäöüß]/.test(char);
}

function removeTrailingIssueList(value: string) {
  let index = value.length;
  let issueCount = 0;

  while (index > 0) {
    while (index > 0 && /\s/.test(value[index - 1] || "")) {
      index -= 1;
    }

    const numberEnd = index;
    while (index > 0 && /\d/.test(value[index - 1] || "")) {
      index -= 1;
    }
    if (numberEnd === index) break;
    issueCount += 1;

    while (index > 0 && /\s/.test(value[index - 1] || "")) {
      index -= 1;
    }

    if (index === 0 || value[index - 1] !== "+") break;
    index -= 1;
  }

  return issueCount > 1 ? value.slice(0, index).trimEnd() : value;
}

function extractBandTitle(line: string) {
  const trimmed = line.trim();
  if (!trimmed.toUpperCase().startsWith("BAND ")) return "";

  const colonIndex = trimmed.indexOf(":");
  if (colonIndex < 0) return "";

  const header = trimmed.slice(0, colonIndex);
  const digits = header.replaceAll(/\D/g, "");
  if (!digits) return "";

  return trimmed.slice(colonIndex + 1).trim();
}

function splitStoryReferenceSegments(value: string) {
  const semicolonSeparated = value.split(";").map((segment) => segment.trim()).filter(Boolean);
  return semicolonSeparated.flatMap((segment) => {
    const parts: string[] = [];
    let current = "";

    for (let index = 0; index < segment.length; index += 1) {
      const char = segment[index] || "";
      const next = segment[index + 1] || "";
      if (char === "," && /\s/.test(next)) {
        const remainder = segment.slice(index + 1).trimStart();
        if (/^[A-ZÄÖÜ]/.test(remainder)) {
          parts.push(current.trim());
          current = "";
          continue;
        }
      }
      current += char;
    }

    parts.push(current.trim());
    return parts.filter(Boolean);
  });
}

function readPageCount(value: string) {
  const match = /(\d+)\s*S\./i.exec(value);
  return match?.[1];
}

function createPseudoRandomToken() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const values = crypto.getRandomValues(new Uint32Array(2));
    return Array.from(values, (value) => value.toString(36)).join("");
  }

  return `${Date.now().toString(36)}-fallback`;
}

function createEmptyIssueValues(): PreviewImportDraft["values"] {
  return {
    title: "",
    series: {
      title: "",
      volume: 0,
      publisher: {
        name: "",
        us: false,
      },
    },
    number: "",
    variant: "",
    cover: "",
    format: KNOWN_FORMATS[0],
    limitation: "",
    pages: 0,
    releasedate: "1900-01-01",
    price: "0",
    currency: "EUR",
    individuals: [],
    addinfo: "",
    comicguideid: 0,
    isbn: "",
    arcs: [],
    stories: [],
    copyBatch: {
      enabled: false,
      count: 1,
      prefix: "",
    },
  };
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}

function ensureFieldItemClientId<T extends Record<string, unknown>>(item: T): T & { uuid?: string } {
  if (item.id || item._id || item.uuid) return item;

  return {
    ...item,
    uuid: createId("story"),
  };
}
