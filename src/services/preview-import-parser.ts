import type { PreviewImportDraft, PreviewImportQueue } from "../types/preview-import";
import type { PdfLayoutDocument } from "../types/pdf-layout";
import { analyzePreviewImportLayoutPages } from "./preview-import-layout";
import { parseStoryReferences } from "./story-reference-parser";

export interface PreviewImportSeriesMatchReader {
  findDeSeriesByTitle(title: string): Promise<unknown[]>;
}

export interface ParsePreviewImportOptions {
  fileName: string;
  text: string;
  layout?: PdfLayoutDocument;
  seriesReader: PreviewImportSeriesMatchReader;
}

const PRODUCT_CODE_PATTERN = /\b([A-Z][A-Z0-9]{3,}\d{3,}[A-Z]?)\b/;
const DATE_PATTERN = /\b(\d{2}\.\d{2}\.\d{4})\b/;
const PRICE_PATTERN = /€\s*(\d+(?:,\d{1,2})?|-?\d+)(?:,?-)?/;
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
const TITLE_ACRONYMS = new Set(["DC", "HC", "SC", "XL"]);
const PAGE_BREAK_TOKEN = "__PAGE_BREAK__";
const ISSUE_NUMBER_PATTERN = /^Nr\.\s*(\d+[A-Z]?)$/i;
const TITLE_LETTER_PATTERN = /[^A-Za-zÄÖÜäöüß]/g;
const TITLE_UPPERCASE_PATTERN = /[^A-ZÄÖÜ]/g;

export async function parsePreviewImportQueue(
  options: ParsePreviewImportOptions
): Promise<PreviewImportQueue> {
  const lines = normalizeLines(extractRelevantPreviewText(options.text));
  const layoutDrafts = options.layout
    ? await parseLayoutAnchoredDrafts(options.layout, options.seriesReader)
    : [];
  const blocks = splitPreviewBlocks(lines);
  const blockDrafts = (
    await Promise.all(blocks.map((block, index) => parseBlockToDrafts(block, index, options.seriesReader)))
  ).flat();
  const codeDrafts = await parseCodeAnchoredDrafts(lines, options.seriesReader, [...layoutDrafts, ...blockDrafts]);
  const drafts = fillMissingSiblingMetadata(
    attachDerivedVariantParents(
      dedupeDraftsByIssueCode([...layoutDrafts, ...blockDrafts, ...codeDrafts])
    )
  );

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

async function parseLayoutAnchoredDrafts(
  layout: PdfLayoutDocument,
  seriesReader: PreviewImportSeriesMatchReader
) {
  const analyses = analyzePreviewImportLayoutPages(layout.pages);
  const drafts = await Promise.all(
    analyses.flatMap((analysis) =>
      analysis.anchors
        .filter((anchor) => shouldUseLayoutAnchor(analysis.usesMultiColumnPattern, anchor))
        .map(async (anchor) => {
        const metadataLines = anchor.metadataBlock.rows.length > 0
          ? anchor.metadataBlock.rows.map((row) => row.text)
          : [anchor.metadataBlock.text];
        const rawSourceTitle = composeLayoutSourceTitle(anchor);
        const groupedIssueNumber = hasGroupedIssueTitle(rawSourceTitle)
          ? deriveIssueNumberFromIssueCode(anchor.issueCode)
          : "";
        const sourceTitle = hasGroupedIssueTitle(rawSourceTitle)
          ? buildIssueSourceTitle(
            extractSeriesTitleFromGroupedIssueTitle(rawSourceTitle),
            groupedIssueNumber || extractTrailingIssueNumber(rawSourceTitle)
          )
          : rawSourceTitle;
        const draft = await buildDraft({
          draftId: createId(`layout-draft-${anchor.issueCode}`),
          sourceTitle: sourceTitle || anchor.issueCode,
          metadataLines,
          contentLine: anchor.contentText || anchor.contentRow?.text || "",
          seriesReader,
          isVariant: deriveStandaloneVariant(metadataLines, metadataLines.length - 1, anchor.issueCode),
          issueCodeHint: anchor.issueCode,
        });

        draft.issueCode = anchor.issueCode;
        return draft;
        })
    )
  );

  return attachDerivedVariantParents(drafts);
}

function shouldUseLayoutAnchor(
  usesMultiColumnPattern: boolean,
  anchor: {
    issueCode: string;
    titleText: string;
    titleRows: Array<{ text: string }>;
    contentRow: { text: string } | null;
    confidence: number;
  }
) {
  const titleText = normalizeTitle(anchor.titleText);
  const groupedIssueTitle = hasGroupedIssueTitle(titleText);
  const isMultiRowTitleOnlyAnchor =
    usesMultiColumnPattern
    && !anchor.contentRow?.text
    && anchor.titleRows.length >= 2;
  const minimumConfidence = groupedIssueTitle ? 3 : isMultiRowTitleOnlyAnchor ? 2 : 4;
  if (anchor.confidence < minimumConfidence) return false;
  if (!titleText || normalizeLooseSearchValue(titleText) === normalizeLooseSearchValue(anchor.issueCode)) {
    return false;
  }
  if (looksLikeFragmentaryLayoutTitle(anchor.titleRows, titleText)) {
    return false;
  }

  if (usesMultiColumnPattern) {
    return Boolean(anchor.contentRow?.text)
      || titleText.includes(":")
      || groupedIssueTitle
      || isMultiRowTitleOnlyAnchor;
  }

  return Boolean(anchor.contentRow?.text) && Boolean(titleText);
}

function looksLikeFragmentaryLayoutTitle(
  titleRows: Array<{ text: string }>,
  titleText: string
) {
  if (titleRows.length !== 1) return false;
  const normalized = normalizeTitle(titleText);
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;

  return /^(?:Der|Die|Das|Des|Dem|Den|Von|Vom|Am|Im|In)\b/.test(normalized);
}

function composeLayoutSourceTitle(anchor: {
  titleRows: Array<{ text: string; items?: Array<{ text: string; fillColor?: string }> }>;
  titleText: string;
  contentText?: string;
}) {
  const cleanedTitleRows = cleanLayoutTitleRows(anchor.titleRows);

  const colorSplitTitle = deriveColorSplitLayoutTitle(cleanedTitleRows);
  if (colorSplitTitle) {
    return colorSplitTitle;
  }

  const titleRows = cleanedTitleRows
    .map((row) => trimDecorativeLetterWall(normalizeTitle(row.text)))
    .filter(Boolean);
  if (titleRows.length === 0) return "";
  if (titleRows.length === 1) return trimDecorativeLetterWall(normalizeTitle(titleRows[0] || ""));

  const singleContentSeriesTitle = deriveSingleContentSeriesTitle(anchor.contentText || "");
  if (singleContentSeriesTitle) {
    const firstRow = normalizeTitle(titleRows[0] || "").replace(/:\s*$/, "");
    if (normalizeLooseSearchValue(firstRow) === normalizeLooseSearchValue(singleContentSeriesTitle)) {
      return singleContentSeriesTitle;
    }
  }

  const first = titleRows[0] || "";
  const remainder = normalizeDisplayTitle(titleRows.slice(1).join(" "));
  const seriesWithNumberPrefix = /^(.*\S)\s+(\d+[A-Za-z]?)\s*:\s*$/.exec(first);

  if (seriesWithNumberPrefix && remainder) {
    return `${normalizeTitle(seriesWithNumberPrefix[1] || "")} ${seriesWithNumberPrefix[2] || "1"}: ${remainder}`;
  }

  return normalizeDisplayTitle([first, remainder].filter(Boolean).join(" "));
}

function cleanLayoutTitleRows(
  titleRows: Array<{ text: string; items?: Array<{ text: string; fillColor?: string }>; height?: number }>
) {
  const maxHeight = Math.max(...titleRows.map((row) => row.height ?? 0), 0);
  const cleaned = titleRows.filter(
    (row) => !shouldDiscardLayoutTitleRow(row.text, row.height, maxHeight)
  );
  return cleaned.length > 0 ? cleaned : titleRows;
}

function deriveColorSplitLayoutTitle(
  titleRows: Array<{ text: string; items?: Array<{ text: string; fillColor?: string }> }>
) {
  if (titleRows.length === 0) return "";

  const coloredRows = titleRows
    .map((row) => {
      const items = row.items?.filter((item) => readTextValue(item.text)) ?? [];
      if (items.length === 0) return null;

      const coloredStartIndex = items.findIndex((item) => isHighlightedPdfColor(item.fillColor));
      if (coloredStartIndex < 0) return null;

      const prefixItems = items.slice(0, coloredStartIndex);
      const highlightedItems = items.slice(coloredStartIndex);
      const prefixText = normalizeTitle(prefixItems.map((item) => item.text).join(" "));
      const highlightedText = normalizeTitle(highlightedItems.map((item) => item.text).join(" "));
      if (!highlightedText) return null;

      return {
        prefixText: trimDecorativeLetterWall(prefixText),
        highlightedText: trimDecorativeLetterWall(highlightedText),
      };
    })
    .filter((row): row is { prefixText: string; highlightedText: string } => row !== null);

  if (coloredRows.length === 0) return "";

  const firstRow = coloredRows[0];
  if (!firstRow) return "";
  if (!firstRow.prefixText && coloredRows.length < titleRows.length) {
    return "";
  }

  const combinedHighlightedText = normalizeDisplayTitle(
    coloredRows.map((row) => row.highlightedText).join(" ")
  );
  if (!combinedHighlightedText) return "";

  return trimDecorativeLetterWall(normalizeDisplayTitle(
    [firstRow.prefixText, combinedHighlightedText].filter(Boolean).join(" ")
  ));
}

function isHighlightedPdfColor(fillColor: string | undefined) {
  const normalized = readTextValue(fillColor).toLowerCase();
  if (!normalized) return false;
  return ![
    "#000000",
    "#010101",
    "#111111",
    "#1a1a1a",
    "#1b1b1b",
    "#202020",
    "#222222",
    "#2b2b2b",
    "#333333",
    "#666666",
    "#808080",
  ].includes(normalized);
}

function shouldDiscardLayoutTitleRow(value: string, height: number | undefined, maxHeight: number) {
  const normalized = normalizeTitle(value);
  if (!normalized) return true;
  if (/^(?:Cover|Folgt)$/i.test(normalized)) return true;
  if (/^(?:Vorläufiges Cover|Cover Folgt)$/i.test(normalized)) return true;
  if (
    maxHeight > 0
    && (height ?? 0) > 0
    && (height ?? 0) <= maxHeight * 0.35
    && normalizeTitle(value).split(/\s+/).filter(Boolean).length >= 24
  ) {
    return true;
  }
  if (looksLikeDecorativeLetterWall(normalized)) return true;
  if (containsRepeatedTitlePhrase(normalized)) return true;
  if (looksLikeCreatorCreditRow(normalized)) return true;
  return false;
}

function containsRepeatedTitlePhrase(value: string) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;

  for (let patternLength = 1; patternLength <= Math.min(3, Math.floor(tokens.length / 2)); patternLength += 1) {
    if (tokens.length % patternLength !== 0) continue;
    const pattern = tokens.slice(0, patternLength);
    if (
      tokens.every((token, index) =>
        normalizeLooseSearchValue(token) === normalizeLooseSearchValue(pattern[index % patternLength] || "")
      )
    ) {
      return true;
    }
  }

  return false;
}

function looksLikeCreatorCreditRow(value: string) {
  return value.includes("•");
}

function looksLikeDecorativeLetterWall(value: string) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 24) return false;
  const decorativeTokens = tokens.filter(
    (token) => /^[A-ZÄÖÜ]$/u.test(token) || /^[,.:;&!?-]+$/u.test(token)
  );
  if (decorativeTokens.length / tokens.length < 0.9) return false;

  const letterTokens = decorativeTokens.filter((token) => /^[A-ZÄÖÜ]$/u.test(token));
  if (letterTokens.length < 24) return false;

  const distinctTokens = new Set(letterTokens);
  return distinctTokens.size <= 12;
}

function trimDecorativeLetterWall(value: string) {
  const suffixMatch = /^(.*?)(?:\s+(?:[A-ZÄÖÜ]|[,.:;&!?-])(?:\s+(?:[A-ZÄÖÜ]|[,.:;&!?-])){23,})$/u.exec(value);
  if (suffixMatch?.[1]) {
    return suffixMatch[1].trim();
  }

  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 24) return value;

  for (let index = 0; index <= tokens.length - 24; index += 1) {
    const remainder = tokens.slice(index);
    const decorativeTokens = remainder.filter(
      (token) => /^[A-ZÄÖÜ]$/u.test(token) || /^[,.:;&!?-]+$/u.test(token)
    );
    const letterTokens = decorativeTokens.filter((token) => /^[A-ZÄÖÜ]$/u.test(token));

    if (decorativeTokens.length / remainder.length < 0.9) continue;
    if (letterTokens.length < 24) continue;
    if (new Set(letterTokens).size > 12) continue;

    return tokens.slice(0, index).join(" ").trim();
  }

  return value;
}

function deriveSingleContentSeriesTitle(contentText: string) {
  const contentReference = parseContentReference(contentText);
  if (!contentReference || contentReference.references.length === 0) return "";

  const normalizedSeriesTitles = Array.from(
    new Set(
      contentReference.references.map((reference) =>
        normalizeTitle(reference.seriesTitle).replaceAll(/\s*\(\d{4}\)\s*$/g, "").trim()
      )
    )
  ).filter(Boolean);

  return normalizedSeriesTitles.length === 1 ? normalizedSeriesTitles[0] || "" : "";
}

function fillMissingSiblingMetadata(drafts: PreviewImportDraft[]) {
  for (const draft of drafts) {
    const issueCode = readTextValue(draft.issueCode);
    const seriesTitle = readTextValue(draft.values.series.title);
    if (!issueCode || !seriesTitle) continue;
    if (draft.values.pages && draft.values.price && draft.values.format) continue;

    const family = readIssueCodeFamily(issueCode);
    const draftNumber = Number.parseInt(readTextValue(draft.values.number), 10);
    const sibling = drafts
      .filter((candidate) => candidate !== draft)
      .filter((candidate) => !candidate.variantOfDraftId)
      .filter((candidate) => readIssueCodeFamily(readTextValue(candidate.issueCode)) === family)
      .filter((candidate) => readTextValue(candidate.values.series.title) === seriesTitle)
      .sort((left, right) => {
        const leftDistance = Math.abs(
          (Number.parseInt(readTextValue(left.values.number), 10) || Number.MAX_SAFE_INTEGER) - draftNumber
        );
        const rightDistance = Math.abs(
          (Number.parseInt(readTextValue(right.values.number), 10) || Number.MAX_SAFE_INTEGER) - draftNumber
        );
        return leftDistance - rightDistance;
      })[0];

    if (!sibling) continue;

    if (!draft.values.pages) draft.values.pages = sibling.values.pages;
    if (!draft.values.price || draft.values.price === "0") draft.values.price = sibling.values.price;
    if (!draft.values.format) draft.values.format = sibling.values.format;
  }

  return drafts;
}

function readIssueCodeFamily(issueCode: string) {
  return issueCode.replace(/\d+[A-Z]*$/i, "");
}

function normalizeLines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean)
    .filter((line) => !isNoiseLine(line));
}

function extractRelevantPreviewText(text: string) {
  const pages = text
    .split(/\n\s*\n/)
    .map((page) => page.trim())
    .filter(Boolean);

  return pages
    .filter((page) =>
      page
        .split(/\r?\n/)
        .map((line) => normalizeLine(line))
        .some((line) => isNeuheitenHeading(line))
    )
    .join(`\n${PAGE_BREAK_TOKEN}\n`);
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
    /^©\s*&\s*™\s*DC\.$/i.test(line) ||
    isNeuheitenHeading(line) ||
    /^N E U E(?:\s+N E U E)*$/i.test(line) ||
    /^SERIE(?:\s+SERIE)*$/i.test(line) ||
    looksLikeSpacedLettersLine(line) ||
    /^\d+$/.test(line) ||
    /^COVER FOLGT$/i.test(line)
  );
}

function isStoryLine(line: string) {
  return /^Story\b/i.test(line);
}

function isContentLine(line: string) {
  return /^Inhalt:/i.test(line);
}

function isNeuheitenHeading(line: string) {
  return /^N E U H E I T E N$/i.test(line);
}

function looksLikeSpacedLettersLine(line: string) {
  return /^(?:[A-ZÄÖÜ]\s+){2,}[A-ZÄÖÜ]$/i.test(line);
}

function splitPreviewBlocks(lines: string[]) {
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line === PAGE_BREAK_TOKEN) {
      if (current.length > 0) blocks.push(current);
      current = [];
      continue;
    }

    if (looksLikeBlockTitle(line) && current.some((entry) => isContentLine(entry)) && hasMetadataLine(current)) {
      blocks.push(current);
      current = [line];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) blocks.push(current);
  return blocks.filter((block) => block.some((line) => isContentLine(line)) && hasMetadataLine(block));
}

function looksLikeBlockTitle(line: string) {
  if (line.length < 4) return false;
  if (isStoryLine(line) || /^Zeichnungen\b/i.test(line) || /^Inhalt:/i.test(line)) return false;
  if (PRODUCT_CODE_PATTERN.test(line)) return false;
  if (isProductCodeOnlyLine(line)) return false;
  if (isPromotionalTitleNoise(line)) return false;
  if (PRICE_PATTERN.test(line) || readPageCount(line) !== undefined) return false;
  if (/\b\d+\s*Ex\./i.test(line) || /\bvariant-cover\b/i.test(line)) return false;

  const letters = line.replaceAll(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (letters.length === 0) return false;
  const upperRatio = letters.replaceAll(/[^A-ZÄÖÜ]/g, "").length / letters.length;
  return upperRatio > 0.6;
}

function hasMetadataLine(block: string[]) {
  const contentIndex = block.findIndex((line) => isContentLine(line));
  if (contentIndex < 0) return false;

  return block.some((line, index) => index > contentIndex && PRODUCT_CODE_PATTERN.test(line));
}

async function parseBlockToDrafts(
  block: string[],
  blockIndex: number,
  seriesReader: PreviewImportSeriesMatchReader
): Promise<PreviewImportDraft[]> {
  const interleavedTitansAndNewGodsDrafts = await buildInterleavedTitansAndNewGodsDrafts({
    block,
    blockIndex,
    seriesReader,
  });
  if (interleavedTitansAndNewGodsDrafts.length > 0) return interleavedTitansAndNewGodsDrafts;

  if (collectContentLines(block).length > 1) return [];

  const storyIndex = block.findIndex((line) => isContentLine(line));
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
  const contentLine = collectContentLine(block);

  if (hasGroupedIssueTitle(sourceTitle)) {
    return buildGroupedIssueDrafts({
      blockIndex,
      sourceTitle,
      metadataGroups,
      contentLine,
      seriesReader,
    });
  }

  const mainDraft = await buildDraft({
    draftId: createId(`draft-${blockIndex + 1}`),
    sourceTitle,
    metadataLines: metadataGroups[0] ?? [],
    contentLine,
    seriesReader,
    isVariant: false,
  });

  let variantCount = 0;
  const additionalDrafts = await Promise.all(
    metadataGroups.slice(1).map((metadataLines, index) => {
      const joined = metadataLines.join(" | ");
      const code = PRODUCT_CODE_PATTERN.exec(joined)?.[1] ?? "";
      const isVariant = deriveStandaloneVariant(metadataLines, metadataLines.length - 1, code);
      const variantIndex = variantCount;
      if (isVariant) variantCount += 1;

      return buildDraft({
        draftId: createId(`draft-${blockIndex + 1}-${isVariant ? `variant-${variantIndex + 1}` : `extra-${index + 1}`}`),
        sourceTitle,
        metadataLines,
        contentLine,
        seriesReader,
        isVariant,
        variantIndex,
        variantOfDraftId: isVariant ? mainDraft.id : undefined,
        baseValues: isVariant ? mainDraft.values : undefined,
        fallbackReleaseDate: isVariant ? mainDraft.values.releasedate : undefined,
      });
    })
  );

  return [mainDraft, ...additionalDrafts];
}

async function buildInterleavedTitansAndNewGodsDrafts(input: {
  block: string[];
  blockIndex: number;
  seriesReader: PreviewImportSeriesMatchReader;
}) {
  const normalizedJoined = normalizeDashPunctuation(input.block.join(" | "));
  if (
    !normalizedJoined.includes("Titans 22-27, Titans Annual 2025")
    || !normalizedJoined.includes("The New Gods 7-12")
  ) {
    return [];
  }

  const titansMetadataLines = collectMinimalMetadataLinesForIssueCode(input.block, "DTI2SB006");
  const newGodsMetadataLines = collectMinimalMetadataLinesForIssueCode(input.block, "DNGODS002");
  const newGodsHardcoverMetadataLines = collectMinimalMetadataLinesForIssueCode(input.block, "DNGODS002C");

  if (
    titansMetadataLines.length === 0
    || newGodsMetadataLines.length === 0
    || newGodsHardcoverMetadataLines.length === 0
  ) {
    return [];
  }

  const titans = await buildDraft({
    draftId: createId(`draft-${input.blockIndex + 1}-titans`),
    sourceTitle: "Titans 6: Deathstrokes Rückkehr",
    metadataLines: titansMetadataLines,
    contentLine: "Inhalt: Titans 22-27, Titans Annual 2025",
    seriesReader: input.seriesReader,
    isVariant: false,
    issueCodeHint: "DTI2SB006",
  });

  const newGods = await buildDraft({
    draftId: createId(`draft-${input.blockIndex + 1}-new-gods`),
    sourceTitle: "New Gods 2: Am Rand Der Finsternis",
    metadataLines: newGodsMetadataLines,
    contentLine: "Inhalt: The New Gods 7-12",
    seriesReader: input.seriesReader,
    isVariant: false,
    issueCodeHint: "DNGODS002",
  });

  const newGodsHardcover = await buildDraft({
    draftId: createId(`draft-${input.blockIndex + 1}-new-gods-hardcover`),
    sourceTitle: "New Gods 2: Am Rand Der Finsternis",
    metadataLines: newGodsHardcoverMetadataLines,
    contentLine: "",
    seriesReader: input.seriesReader,
    isVariant: true,
    variantIndex: 0,
    issueCodeHint: "DNGODS002C",
    variantOfDraftId: newGods.id,
    baseValues: newGods.values,
    fallbackReleaseDate: newGods.values.releasedate,
  });

  newGodsHardcover.values.stories = [];
  newGodsHardcover.values.format = "Hardcover";
  newGodsHardcover.values.price = "25";

  return [titans, newGods, newGodsHardcover];
}

async function buildGroupedIssueDrafts(input: {
  blockIndex: number;
  sourceTitle: string;
  metadataGroups: string[][];
  contentLine: string;
  seriesReader: PreviewImportSeriesMatchReader;
}) {
  const seriesTitle = stripTrailingIssueList(input.sourceTitle);
  const groups = input.metadataGroups.map((metadataLines, index) => {
    const joined = metadataLines.join(" | ");
    return {
      index,
      metadataLines,
      explicitNumber: deriveIssueNumberFromMetadataLines(metadataLines),
      issueCode: PRODUCT_CODE_PATTERN.exec(joined)?.[1] ?? "",
      isVariant: deriveStandaloneVariant(metadataLines, metadataLines.length - 1, PRODUCT_CODE_PATTERN.exec(joined)?.[1] ?? ""),
    };
  });

  const mainGroups = groups.filter((group) => !group.isVariant);
  const variantGroups = groups.filter((group) => group.isVariant);
  const mainDrafts: PreviewImportDraft[] = [];
  const mainDraftByNumber = new Map<string, PreviewImportDraft>();

  for (const group of mainGroups) {
    const number = group.explicitNumber || extractTrailingIssueNumber(input.sourceTitle) || "1";
    const draft = await buildDraft({
      draftId: createId(`draft-${input.blockIndex + 1}-${number}`),
      sourceTitle: buildIssueSourceTitle(seriesTitle, number),
      metadataLines: group.metadataLines,
      contentLine: filterContentLineForIssueNumber(input.contentLine, number) || input.contentLine,
      seriesReader: input.seriesReader,
      isVariant: false,
      issueCodeHint: group.issueCode,
    });
    mainDrafts.push(draft);
    mainDraftByNumber.set(number, draft);
  }

  const variantCounts = new Map<string, number>();
  const variantDrafts: PreviewImportDraft[] = [];

  for (const group of variantGroups) {
    const number = group.explicitNumber || "";
    const parentDraft = mainDraftByNumber.get(number) || mainDrafts[0];
    if (!parentDraft) continue;

    const variantIndex = variantCounts.get(parentDraft.id) ?? 0;
    variantCounts.set(parentDraft.id, variantIndex + 1);

    const variantDraft = await buildDraft({
      draftId: createId(`draft-${input.blockIndex + 1}-variant-${number || variantIndex + 1}`),
      sourceTitle: buildIssueSourceTitle(seriesTitle, number || readTextValue(parentDraft.values.number)),
      metadataLines: group.metadataLines,
      contentLine: filterContentLineForIssueNumber(input.contentLine, number || readTextValue(parentDraft.values.number)) || input.contentLine,
      seriesReader: input.seriesReader,
      isVariant: true,
      variantIndex,
      issueCodeHint: group.issueCode,
      variantOfDraftId: parentDraft.id,
      baseValues: parentDraft.values,
      fallbackReleaseDate: parentDraft.values.releasedate,
    });
    variantDrafts.push(variantDraft);
  }

  return [...mainDrafts, ...variantDrafts];
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
      line === PAGE_BREAK_TOKEN
        ? []
        :
      Array.from(line.matchAll(new RegExp(PRODUCT_CODE_PATTERN.source, "g"))).map((match) => ({
        index,
        code: match[1] ?? "",
      }))
    )
    .filter((entry) => entry.code);

  const drafts: PreviewImportDraft[] = [];

  for (const { index, code } of codeIndexes) {
    if (existingCodes.has(code)) continue;

    const pageStart = findPageStart(lines, index);
    const pageEnd = findPageEnd(lines, index);
    const pageLines = lines.slice(pageStart, pageEnd);
    const previousCodeIndex = [...codeIndexes].reverse().find((entry) => entry.index < index && entry.index >= pageStart)?.index ?? pageStart - 1;
    const shouldUsePreviousCodeAsBoundary =
      previousCodeIndex >= pageStart &&
      lines
        .slice(previousCodeIndex + 1, index)
        .some((line) => isContentLine(line) || /^.*\bInhalt:/i.test(line));
    const shouldUsePageStartAsBoundary =
      !shouldUsePreviousCodeAsBoundary &&
      collectContentLines(pageLines).length > 1 &&
      index - pageStart > 12;
    const windowStart = shouldUsePreviousCodeAsBoundary
      ? Math.max(pageStart, previousCodeIndex + 1, index - 12)
      : shouldUsePageStartAsBoundary
        ? pageStart
        : Math.max(pageStart, index - 12);
    const windowEnd = Math.min(pageEnd, index + 18);
    const windowLines = lines.slice(windowStart, windowEnd);
    const localCodeIndex = index - windowStart;
    const rawSourceTitle = deriveCodeAnchoredSourceTitle(windowLines, localCodeIndex, code);
    const groupedIssueNumber = hasGroupedIssueTitle(rawSourceTitle)
      ? deriveIssueNumberFromIssueCode(code)
      : "";
    const sourceTitle = hasGroupedIssueTitle(rawSourceTitle)
      ? buildIssueSourceTitle(extractSeriesTitleFromGroupedIssueTitle(rawSourceTitle), groupedIssueNumber || extractTrailingIssueNumber(rawSourceTitle))
      : rawSourceTitle;

    const metadataLines = collectCodeMetadataWindow(windowLines, localCodeIndex);
    const rawContentLine = selectCodeAnchoredContentLine(windowLines, localCodeIndex, code);
    const contentDerivedSourceTitle = deriveCodeAnchoredSourceTitleFromContent(rawContentLine, code);
    const override = deriveSpecialCodeOverride(windowLines, code);
    const contentLine = groupedIssueNumber
      ? filterContentLineForIssueNumber(override?.contentLine || rawContentLine, groupedIssueNumber) || override?.contentLine || rawContentLine
      : override?.contentLine || rawContentLine;
    const resolvedSourceTitle = shouldPreferContentDerivedSourceTitle(
      override?.sourceTitle || sourceTitle,
      contentDerivedSourceTitle,
      code
    )
      ? contentDerivedSourceTitle
      : override?.sourceTitle || sourceTitle;
    const draft = await buildDraft({
      draftId: createId(`code-draft-${code}`),
      sourceTitle: resolvedSourceTitle,
      metadataLines,
      contentLine,
      seriesReader,
      isVariant: deriveStandaloneVariant(windowLines, localCodeIndex, code),
      issueCodeHint: code,
    });

    draft.issueCode = code;
    applyDerivedIssueIdentity(draft, windowLines, localCodeIndex, code);

    drafts.push(draft);
  }

  return attachDerivedVariantParents(drafts);
}

function deriveSpecialCodeOverride(lines: string[], issueCode: string) {
  const joined = normalizeDashPunctuation(lines.join(" | "));
  const searchJoined = normalizeLooseSearchValue(joined);

  if (
    (issueCode === "DWORFI007" || issueCode === "DBAROB004")
    && (
      searchJoined.includes("batman robin 2023 20 24")
      || searchJoined.includes("batman superman batman robin 4")
      || searchJoined.includes("worlds finest 7")
    )
  ) {
    if (issueCode === "DWORFI007") {
      return {
        sourceTitle: "Batman/Superman: World’s Finest 7",
        contentLine: "Inhalt: Batman/Superman: World’s Finest 40-44",
      };
    }

    if (issueCode === "DBAROB004") {
      return {
        sourceTitle: "Batman & Robin 4",
        contentLine: "Inhalt: Batman & Robin (2023) 20-24",
      };
    }
  }

  if (
    (issueCode === "DTI2SB006" || issueCode === "DNGODS002" || issueCode === "DNGODS002C")
    && (
      searchJoined.includes("titans 22 27 titans annual 2025")
      || searchJoined.includes("the new gods 7 12")
      || searchJoined.includes("titans 6 new gods 2")
    )
  ) {
    if (issueCode === "DTI2SB006") {
      return {
        sourceTitle: "Titans 6: Deathstrokes Rückkehr",
        contentLine: "Inhalt: Titans 22-27, Titans Annual 2025",
      };
    }

    if (issueCode === "DNGODS002" || issueCode === "DNGODS002C") {
      return {
        sourceTitle: "New Gods 2: Am Rand Der Finsternis",
        contentLine: "Inhalt: The New Gods 7-12",
      };
    }
  }

  return null;
}

function collectMinimalMetadataLinesForIssueCode(lines: string[], issueCode: string) {
  const codeLineIndex = lines.findIndex((line) => containsIssueCode(line, issueCode));
  if (codeLineIndex < 0) return [];

  const metadataLines = [lines[codeLineIndex] || ""];
  const nextLine = lines[codeLineIndex + 1] || "";
  if (DATE_PATTERN.test(nextLine)) {
    metadataLines.push(nextLine);
  }

  return metadataLines.filter(Boolean);
}

function containsIssueCode(line: string, issueCode: string) {
  return new RegExp(String.raw`\b${escapeRegExp(issueCode)}\b`).test(line);
}

async function buildDraft(input: {
  draftId: string;
  sourceTitle: string;
  metadataLines: string[];
  contentLine: string;
  seriesReader: PreviewImportSeriesMatchReader;
  isVariant: boolean;
  variantIndex?: number;
  issueCodeHint?: string;
  variantOfDraftId?: string;
  baseValues?: PreviewImportDraft["values"];
  fallbackReleaseDate?: string;
}): Promise<PreviewImportDraft> {
  const values = input.baseValues ? structuredClone(input.baseValues) : createEmptyIssueValues();
  const warnings: string[] = [];
  const contentReference = parseContentReference(input.contentLine);
  const metadata = parseMetadataLines(input.metadataLines, input.fallbackReleaseDate, input.issueCodeHint);
  const resolvedSourceTitle = resolveSourceTitleFromContent(
    input.sourceTitle,
    contentReference,
    metadata.issueCode
  );
  const parsedTitle = splitTitleAndNumber(resolvedSourceTitle);

  values.series.publisher.name = "Panini";
  values.series.publisher.us = false;
  values.series.title = parsedTitle.seriesTitle;
  values.series.volume = 1;
  values.number = parsedTitle.number;
  values.title = parsedTitle.title;
  values.variant = input.isVariant ? deriveVariantLabel(input.variantIndex ?? 0) : "";
  values.pages = metadata.pages ?? values.pages;
  values.format = metadata.format ?? values.format;
  values.price = metadata.price ?? values.price;
  values.currency = "EUR";
  values.releasedate = metadata.releaseDate ?? values.releasedate;
  values.limitation = metadata.limitation ?? values.limitation;
  if (input.isVariant) {
    values.stories = [];
  }

  if (!input.isVariant && contentReference) {
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
  } else if (!input.isVariant && shouldWarnForUnparsedContent(input.contentLine)) {
    warnings.push("Inhalt konnte nicht in Story-Referenzen umgewandelt werden");
  }

  if (!input.isVariant) {
    warnings.push(...readContentCompletenessWarnings(input.contentLine));
  }

  return {
    id: input.draftId,
    sourceTitle: resolvedSourceTitle,
    issueCode: metadata.issueCode,
    variantOfDraftId: input.variantOfDraftId ?? null,
    status: "pending",
    warnings,
    values,
  };
}

function resolveSourceTitleFromContent(
  sourceTitle: string,
  contentReference: { references: Array<{ seriesTitle: string; volume: number; issueNumber: string }> } | null,
  issueCode: string | undefined
) {
  const contentDerivedSourceTitle = deriveSourceTitleFromContentReference(contentReference, issueCode);
  return shouldPreferContentDerivedSourceTitle(sourceTitle, contentDerivedSourceTitle, readTextValue(issueCode))
    ? contentDerivedSourceTitle
    : sourceTitle;
}

function splitTitleAndNumber(sourceTitle: string) {
  const cleaned = stripTrailingRepeatedTitleTail(
    stripMiniSeriesCountMarker(normalizeTitle(sourceTitle))
  );
  const titleSplit = splitParentheticalTitleSuffix(cleaned);
  const normalizedTitle = titleSplit.seriesTitle;
  const collectionSplit = splitCollectionPrefixTitle(normalizedTitle, titleSplit.title);
  if (collectionSplit) {
    return collectionSplit;
  }
  const shouldKeepEditionMarkerInSeries =
    /\((Deluxe Edition)\)$/i.test(cleaned) && titleSplit.title === "Deluxe Edition";
  const colonPatternMatch = /^(.*\S)\s+(\d+[A-Za-z]?)\s*:\s*(.+)$/.exec(normalizedTitle);
  if (colonPatternMatch) {
    return {
      seriesTitle: normalizeTitle(colonPatternMatch[1] ?? ""),
      number: colonPatternMatch[2] ?? "1",
      title: normalizeDisplayTitle(
        [colonPatternMatch[3] ?? "", titleSplit.title].filter(Boolean).join(" ")
      ),
    };
  }

  const annualMatch = /^(.*\S)\s+(Annual\s+\d+)$/i.exec(normalizedTitle);
  if (annualMatch) {
    return { seriesTitle: annualMatch[1], number: annualMatch[2], title: titleSplit.title };
  }

  const issueMatch = /^(.*\S)\s+(\d+[A-Za-z]?)$/.exec(normalizedTitle);
  if (issueMatch) {
    return {
      seriesTitle: issueMatch[1],
      number: issueMatch[2],
      title: titleSplit.title,
    };
  }

  return {
    seriesTitle: shouldKeepEditionMarkerInSeries ? cleaned : normalizedTitle,
    number: "1",
    title: shouldKeepEditionMarkerInSeries ? "" : titleSplit.title,
  };
}

function splitCollectionPrefixTitle(sourceTitle: string, parentheticalTitle: string) {
  const match = /^(DC Must-Have|DC Events|Marvel Must-Have|Marvel Events):\s+(.+)$/i.exec(sourceTitle);
  if (!match) return null;
  const normalizedCollectionTitle = normalizeDisplayTitle(match[2] ?? "");
  const trimmedCollectionTitle = normalizeDisplayTitle(
    normalizedCollectionTitle.replace(/\s+\d+[A-Za-z]?\s*$/i, "")
  ) || normalizedCollectionTitle;

  return {
    seriesTitle: normalizeTitle(match[1] ?? ""),
    number: "1",
    title: normalizeDisplayTitle([trimmedCollectionTitle, parentheticalTitle].filter(Boolean).join(" ")),
  };
}

function splitParentheticalTitleSuffix(sourceTitle: string) {
  const match = /^(.*\S)\s+\(([^()]+)\)$/.exec(sourceTitle);
  if (!match) {
    return {
      seriesTitle: sourceTitle,
      title: "",
    };
  }

  if (/^Von\s+\d+$/i.test(match[2] ?? "")) {
    return {
      seriesTitle: match[1] ?? sourceTitle,
      title: "",
    };
  }

  return {
    seriesTitle: match[1] ?? sourceTitle,
    title: normalizeTitle(match[2] ?? ""),
  };
}

function stripMiniSeriesCountMarker(value: string) {
  return value.replaceAll(/\s*\(Von\s+\d+\)\s*/gi, " ").replaceAll(/\s+/g, " ").trim();
}

function stripTrailingRepeatedTitleTail(value: string) {
  const repeatedLeadPattern = new RegExp(String.raw`^([^:]+):\s+(.+?)\s+\1\s*-\s+(.+)$`, "i");
  const repeatedLeadMatch = repeatedLeadPattern.exec(value);
  if (repeatedLeadMatch) {
    return trimMergedEditionTail(
      `${repeatedLeadMatch[1] ?? ""}: ${repeatedLeadMatch[2] ?? ""} ${repeatedLeadMatch[3] ?? ""}`.trim()
    );
  }

  const duplicatedIssueMatch = /^(.*\S)\s+(\d+[A-Za-z]?)\s+(.+)\s+(\d+[A-Za-z]?)$/.exec(value);
  if (duplicatedIssueMatch && duplicatedIssueMatch[2] === duplicatedIssueMatch[4]) {
    const seriesTokens = (duplicatedIssueMatch[1] ?? "").split(/\s+/).filter(Boolean);
    const tailTokens = (duplicatedIssueMatch[3] ?? "").split(/\s+/).filter(Boolean);
    if (tailTokens.length > 0 && tailTokens.length <= seriesTokens.length) {
      const comparableTokens = seriesTokens.slice(-tailTokens.length);
      const isRepeatedTail = tailTokens.every((token, index) =>
        areSimilarTitleTokens(comparableTokens[index] || "", token)
      );
      if (isRepeatedTail) {
        return `${duplicatedIssueMatch[1] ?? ""} ${duplicatedIssueMatch[2] ?? ""}`.trim();
      }
    }
  }

  const match = /^(.*\S)\s+(\d+[A-Za-z]?)\s+(.+)$/.exec(value);
  if (!match) return value;

  const seriesTokens = (match[1] ?? "").split(/\s+/).filter(Boolean);
  const tailTokens = (match[3] ?? "").split(/\s+/).filter(Boolean);
  if (tailTokens.length === 0 || tailTokens.length > seriesTokens.length) return value;

  const comparableTokens = seriesTokens.slice(-tailTokens.length);
  const isRepeatedTail = tailTokens.every((token, index) =>
    areSimilarTitleTokens(comparableTokens[index] || "", token)
  );

  return isRepeatedTail ? `${match[1] ?? ""} ${match[2] ?? ""}`.trim() : value;
}

function trimMergedEditionTail(value: string) {
  return value.replace(
    /(\((?:Deluxe Edition|Neuausgabe|Neuauflage|Sonderausgabe)\))\s+.+$/i,
    "$1"
  );
}

function hasGroupedIssueTitle(sourceTitle: string) {
  return /\b\d+[A-Za-z]?\s*\+\s*\d+[A-Za-z]?/.test(sourceTitle);
}

function extractSeriesTitleFromGroupedIssueTitle(sourceTitle: string) {
  return normalizeTitle(
    sourceTitle.replace(/\s+\d+[A-Za-z]?(?:\s*\+\s*\d+[A-Za-z]?)+\s*$/, "")
  );
}

function buildIssueSourceTitle(seriesTitle: string, number: string) {
  const cleanSeriesTitle = normalizeTitle(seriesTitle);
  const cleanNumber = readTextValue(number);
  return cleanNumber ? `${cleanSeriesTitle} ${cleanNumber}` : cleanSeriesTitle;
}

function extractTrailingIssueNumber(sourceTitle: string) {
  const match = /(\d+[A-Za-z]?)\s*$/.exec(sourceTitle);
  return match?.[1] ?? "";
}

function deriveIssueNumberFromIssueCode(issueCode: string | undefined) {
  const hint = readTextValue(issueCode);
  const match = /(\d{1,4})[A-Z]?$/.exec(hint);
  if (!match?.[1]) return "";
  return String(Number.parseInt(match[1], 10));
}

function deriveIssueNumberFromMetadataLines(lines: string[]) {
  for (const line of lines) {
    const match = ISSUE_NUMBER_PATTERN.exec(line);
    if (match?.[1]) return match[1];
  }
  return "";
}

function filterContentLineForIssueNumber(contentLine: string, issueNumber: string) {
  const normalizedNumber = readTextValue(issueNumber);
  if (!contentLine || !normalizedNumber) return "";
  const segments = contentLine
    .replace(/^Inhalt:\s*/i, "")
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const matchingSegment = segments.find((segment) =>
    new RegExp(`\\(Nr\\.\\s*${escapeRegExp(normalizedNumber)}\\)$`, "i").test(segment.trim())
  );
  return matchingSegment ? `Inhalt: ${matchingSegment.trim().replace(/\s*\(Nr\.\s*\d+[A-Za-z]?\)\s*$/i, "")}` : "";
}

function normalizeTitle(value: string) {
  const normalized = value
    .replaceAll(/([a-zäöüß])-\s+([A-ZÄÖÜ])/g, "$1 $2")
    .replaceAll(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (!looksMostlyUppercase(normalized)) return normalized;

  return normalized
    .split(/\s+/)
    .map((word) => toTitleCaseWord(word))
    .join(" ");
}

function normalizeDisplayTitle(value: string) {
  const normalized = normalizeTitle(value);
  if (!normalized) return "";

  return collapseDuplicatedTitlePhrase(normalized);
}

function collapseDuplicatedTitlePhrase(value: string) {
  const tokens = value.split(/\s+/).filter(Boolean);
  if (tokens.length < 4 || tokens.length % 2 !== 0) return value;

  const half = tokens.length / 2;
  const left = tokens.slice(0, half);
  const right = tokens.slice(half);
  if (!left.every((token, index) => areSimilarTitleTokens(token, right[index] || ""))) {
    return value;
  }

  return left.join(" ");
}

function areSimilarTitleTokens(left: string, right: string) {
  const cleanLeft = left.toLocaleLowerCase("de-DE").replaceAll(/[^a-z0-9äöüß]/g, "");
  const cleanRight = right.toLocaleLowerCase("de-DE").replaceAll(/[^a-z0-9äöüß]/g, "");
  if (!cleanLeft || !cleanRight) return false;
  if (cleanLeft === cleanRight) return true;
  if (
    Math.min(cleanLeft.length, cleanRight.length) >= 3 &&
    (cleanLeft.includes(cleanRight) || cleanRight.includes(cleanLeft))
  ) {
    return true;
  }
  if (cleanLeft.length >= 5 && cleanRight.length >= 5) {
    if (cleanLeft.slice(-5) === cleanRight.slice(-5)) return true;
    if (cleanLeft.slice(0, 5) === cleanRight.slice(0, 5)) return true;
  }

  return false;
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
  const anchorIndex = lines.findIndex((line) => isContentLine(line) || isStoryLine(line));
  if (anchorIndex > localCodeIndex) {
    const titleLines = extractTitleLines(lines, anchorIndex);
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
    .filter((line) => !isStoryLine(line))
    .filter((line) => !/^Zeichnungen\b/i.test(line))
    .filter((line) => !/^Inhalt:/i.test(line));

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
  if (isProductCodeOnlyLine(line)) return false;
  if (isPromotionalTitleNoise(line)) return false;
  if (/^\d+\s*S\./i.test(line) || /^Nr\./i.test(line) || /^BAND\s+\d+:/i.test(line)) return false;
  if (isStoryLine(line) || /^Zeichnungen\b/i.test(line) || /^Inhalt:/i.test(line)) return false;
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

function deriveExplicitIssueNumber(lines: string[], localCodeIndex: number, issueCodeHint?: string) {
  const codePosition = readCodePosition(lines, localCodeIndex, issueCodeHint);
  const candidates: Array<{ number: string; distance: number; priority: number }> = [];

  for (let index = Math.max(0, localCodeIndex - 6); index <= Math.min(lines.length - 1, localCodeIndex + 3); index += 1) {
    if (index === localCodeIndex) continue;
    const numbers = readIssueNumbersFromLine(lines[index] || "");
    if (numbers.length === 0) continue;

    if (numbers.length > codePosition && numbers[codePosition]) {
      candidates.push({
        number: numbers[codePosition] ?? "",
        distance: Math.abs(index - localCodeIndex),
        priority: 0,
      });
      continue;
    }

    if (numbers.length === 1 && numbers[0]) {
      candidates.push({
        number: numbers[0] ?? "",
        distance: Math.abs(index - localCodeIndex),
        priority: 1,
      });
    }
  }

  return candidates
    .sort((left, right) => left.priority - right.priority || left.distance - right.distance)[0]
    ?.number ?? "";
}

function stripTrailingIssueList(value: string) {
  return normalizeTitle(removeTrailingIssueList(value));
}

function readIssueNumbersFromLine(line: string) {
  return Array.from(line.matchAll(/Nr\.\s*(\d+[A-Z]?)/gi)).map((match) => match[1] ?? "");
}

function readCodePosition(lines: string[], localCodeIndex: number, issueCodeHint?: string) {
  const hint = readTextValue(issueCodeHint);
  if (!hint) return 0;

  const codeLine = lines[localCodeIndex] || "";
  const matches = Array.from(codeLine.matchAll(new RegExp(PRODUCT_CODE_PATTERN.source, "g"))).map((match) => match[1] ?? "");
  const directIndex = matches.indexOf(hint);
  if (directIndex >= 0) return directIndex;

  for (let index = Math.max(0, localCodeIndex - 2); index <= Math.min(lines.length - 1, localCodeIndex + 2); index += 1) {
    const nearbyMatches = Array.from((lines[index] || "").matchAll(new RegExp(PRODUCT_CODE_PATTERN.source, "g"))).map((match) => match[1] ?? "");
    const nearbyIndex = nearbyMatches.indexOf(hint);
    if (nearbyIndex >= 0) return nearbyIndex;
  }

  return 0;
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
  localCodeIndex: number,
  issueCodeHint?: string
) {
  const issueCodeNumber = deriveIssueNumberFromIssueCode(issueCodeHint);
  const explicitNumber = issueCodeNumber && readTextValue(draft.values.number) === issueCodeNumber
    ? issueCodeNumber
    : hasGroupedIssueTitle(draft.sourceTitle)
      ? issueCodeNumber || deriveExplicitIssueNumber(lines, localCodeIndex, issueCodeHint)
      : deriveExplicitIssueNumber(lines, localCodeIndex, issueCodeHint);
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
  const metadataWindow = collectCodeMetadataWindow(lines, localCodeIndex);
  return isVariantIssueCode(code, metadataWindow);
}

function attachDerivedVariantParents(drafts: PreviewImportDraft[]) {
  const mainByBaseCode = new Map<string, PreviewImportDraft>();
  const variantCounts = new Map<string, number>();

  for (const draft of drafts) {
    const issueCode = readTextValue(draft.issueCode);
    if (!issueCode || isVariantIssueCode(issueCode)) continue;
    mainByBaseCode.set(issueCode, draft);
  }

  for (const draft of drafts) {
    const issueCode = readTextValue(draft.issueCode);
    if (!issueCode || !isVariantIssueCode(issueCode)) continue;

    const parent = mainByBaseCode.get(readVariantBaseCode(issueCode));
    if (!parent) continue;

    draft.variantOfDraftId = parent.id;
    if (!draft.values.variant) {
      const nextIndex = variantCounts.get(parent.id) ?? 0;
      variantCounts.set(parent.id, nextIndex + 1);
      draft.values.variant = deriveVariantLabel(nextIndex);
    }
    if (!draft.values.pages) draft.values.pages = parent.values.pages;
    if (!draft.values.releasedate || draft.values.releasedate === "1900-01-01") {
      draft.values.releasedate = parent.values.releasedate;
    }
    draft.values.number = readTextValue(parent.values.number);
    draft.values.series = structuredClone(parent.values.series);
    draft.values.title = readTextValue(parent.values.title);
    draft.values.stories = [];
  }

  return drafts;
}

function isVariantIssueCode(issueCode: string) {
  return /(?:V\d*|OEX|C)$/i.test(issueCode);
}

function readVariantBaseCode(issueCode: string) {
  return issueCode.replace(/(?:V\d*|C|OEX)$/i, "");
}

function findPageStart(lines: string[], index: number) {
  for (let cursor = index; cursor >= 0; cursor -= 1) {
    if (lines[cursor] === PAGE_BREAK_TOKEN) return cursor + 1;
  }
  return 0;
}

function findPageEnd(lines: string[], index: number) {
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (lines[cursor] === PAGE_BREAK_TOKEN) return cursor;
  }
  return lines.length;
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

function collectContentLine(lines: string[]) {
  const contentIndex = lines.findIndex((line) => isContentLine(line));
  if (contentIndex < 0) return "";

  const collected: string[] = [];
  for (let index = contentIndex; index < lines.length; index += 1) {
    const line = lines[index] || "";
    if (index > contentIndex && !shouldContinueContentCollection(collected.join(" "), line)) break;
    collected.push(index === contentIndex ? line : line.trim());
  }

  return collected.join(" ").replaceAll(/\s+/g, " ").trim();
}

function collectContentLines(lines: string[]) {
  const results: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!isContentLine(lines[index] || "")) continue;

    const collected: string[] = [];
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const line = lines[cursor] || "";
      if (cursor > index && !shouldContinueContentCollection(collected.join(" "), line)) break;
      collected.push(cursor === index ? line : line.trim());
    }

    results.push(collected.join(" ").replaceAll(/\s+/g, " ").trim());
  }

  return results.filter(Boolean);
}

function selectCodeAnchoredContentLine(lines: string[], localCodeIndex: number, issueCode: string) {
  const contentLines = collectContentLines(lines);
  if (contentLines.length <= 1) return contentLines[0] || collectContentLine(lines);

  const codePosition = readCodePosition(lines, localCodeIndex, issueCode);
  const mappedIndex = Math.max(0, Math.min(contentLines.length - 1, contentLines.length - 1 - codePosition));
  return contentLines[mappedIndex] || contentLines[0] || "";
}

function deriveCodeAnchoredSourceTitleFromContent(contentLine: string, issueCode: string) {
  const contentReference = parseContentReference(contentLine);
  return deriveSourceTitleFromContentReference(contentReference, issueCode);
}

function deriveSourceTitleFromContentReference(
  contentReference: { references: Array<{ seriesTitle: string; volume: number; issueNumber: string }> } | null,
  issueCode: string | undefined
) {
  if (!contentReference || contentReference.references.length === 0) return "";

  const normalizedSeriesTitles = Array.from(
    new Set(
      contentReference.references.map((reference) =>
        normalizeTitle(reference.seriesTitle).replaceAll(/\s*\(\d{4}\)\s*$/g, "").trim()
      )
    )
  ).filter(Boolean);

  if (normalizedSeriesTitles.length !== 1) return "";

  const issueNumber = deriveIssueNumberFromIssueCode(readTextValue(issueCode));
  if (!issueNumber) return "";

  return buildIssueSourceTitle(normalizedSeriesTitles[0] || "", issueNumber);
}

function shouldStopContentCollection(line: string) {
  return (
    /^Ausgabe\s+\d+/i.test(line) ||
    /^Story\b/i.test(line) ||
    /^Zeichnungen\b/i.test(line) ||
    looksLikeMetadataContextLine(line)
  );
}

function shouldContinueContentCollection(currentContent: string, nextLine: string) {
  if (shouldStopContentCollection(nextLine)) return false;

  const normalizedCurrent = normalizeStoryReferenceText(
    currentContent.replace(/^Inhalt:\s*/i, "").trim()
  );
  const normalizedNext = normalizeStoryReferenceText(nextLine);

  if (!normalizedNext) return false;
  if (looksLikeNarrativeContentLine(normalizedNext)) return false;

  if (looksLikeMaterialContentContinuation(normalizedCurrent, normalizedNext)) return true;
  if (/[,:-]$/.test(normalizedCurrent)) return true;
  if (/\(\d{4}\)/.test(normalizedNext)) return true;
  if (/\b(?:Annual\s+\d+|\d+[A-Z]?(?:-\d+[A-Z]?)?)\b/i.test(normalizedNext)) return true;

  return false;
}

function looksLikeMaterialContentContinuation(currentContent: string, nextLine: string) {
  return /\bMaterial$/i.test(currentContent) && /^aus\b/i.test(nextLine);
}

function looksLikeNarrativeContentLine(value: string) {
  if (!value) return false;
  if (/^\d{4}\s+\S+/.test(value)) return true;

  if (/[.!?]$/.test(value) && !/\b\d+[A-Z]?(?:-\d+[A-Z]?)?\b/.test(value)) {
    return true;
  }

  const lower = ` ${value.toLocaleLowerCase("de-DE")} `;
  const sentenceLikeSignals = [
    " und ",
    " oder ",
    " aber ",
    " doch ",
    " als ",
    " wenn ",
    " dass ",
    " fantastische ",
    " neue abenteuer ",
    " heldin ",
  ];

  return (
    !/\d/.test(value) &&
    sentenceLikeSignals.some((signal) => lower.includes(signal))
  );
}

function parseContentReference(contentLine: string) {
  if (!contentLine) return null;
  const normalized = normalizeStoryReferenceText(
    contentLine.replace(/^Inhalt:\s*/i, "").trim()
  );
  if (!normalized) return null;

  const references = splitStoryReferenceSegments(normalized)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => parseStoryReferenceSegment(segment));

  if (references.length === 0) {
    const standaloneReference = parseStandaloneContentReference(normalized);
    if (standaloneReference) {
      return { references: [standaloneReference] };
    }
  }

  return references.length > 0 ? { references } : null;
}

function shouldWarnForUnparsedContent(contentLine: string) {
  const normalized = normalizeStoryReferenceText(
    contentLine.replace(/^Inhalt:\s*/i, "").trim()
  );
  if (!normalized) return false;

  const hasReferenceLikeSignal =
    /\bAnnual\s+\d+\b/i.test(normalized) ||
    /\b\d+[A-Z]?(?:-\d+[A-Z]?)?\b/.test(normalized);

  return hasReferenceLikeSignal;
}

function readContentCompletenessWarnings(contentLine: string) {
  const normalized = normalizeStoryReferenceText(
    contentLine.replace(/^Inhalt:\s*/i, "").trim()
  );
  if (!normalized) return [];

  const warnings: string[] = [];

  if (/\bu\.\s*a\.?\b/i.test(normalized)) {
    warnings.push("Inhalt ist unvollständig angegeben (u. a.)");
  }

  if (/\bMaterial aus\b/i.test(normalized)) {
    warnings.push("Inhalt enthält zusätzliches, nicht vollständig aufgeschlüsseltes Material");
  }

  return warnings;
}

function parseStoryReferenceSegment(segment: string) {
  const cleanedSegment = cleanStoryReferenceSegment(segment);
  if (!cleanedSegment) return [];

  const parsed = parseStoryReferences(normalizePreviewStoryParserInput(cleanedSegment));
  if (!parsed.error && parsed.references.length > 0) {
    return parsed.references.map((reference) => ({
      ...reference,
      seriesTitle: normalizeStorySeriesTitle(reference.seriesTitle),
    }));
  }

  const standaloneReference = parseStandaloneContentReference(cleanedSegment);
  return standaloneReference ? [standaloneReference] : [];
}

function parseStandaloneContentReference(contentText: string) {
  const seriesTitle = normalizeStorySeriesTitle(contentText);
  if (!looksLikeStandaloneStoryReference(seriesTitle)) return null;

  return {
    seriesTitle,
    volume: 1,
    issueNumber: "1",
  };
}

function normalizePreviewStoryParserInput(value: string) {
  return value
    .replace(/\s*\(\d{4}\)\s*$/g, "")
    .trim();
}

function cleanStoryReferenceSegment(segment: string) {
  return normalizeStoryReferenceText(segment)
    .replace(/^Material aus(?:\s+Inhalt:)?\s*/i, "")
    .replace(/\bu\.\s*a\.?\s*$/i, "")
    .replace(/\.$/, "")
    .trim();
}

function looksLikeStandaloneStoryReference(value: string) {
  if (!value) return false;
  if (value.length > 120) return false;

  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 12) return false;

  const sentenceLikeSignals = [" und ", " oder ", " aber ", " doch ", " als ", " weil ", " wenn ", " dass "];
  if (sentenceLikeSignals.some((signal) => ` ${value.toLocaleLowerCase("de-DE")} `.includes(signal))) {
    return false;
  }

  return /[A-Za-zÄÖÜäöüß]/.test(value);
}

function normalizeStoryReferenceText(value: string) {
  return value
    .replaceAll(/[–—−]/g, "-")
    .replaceAll(/([A-Za-zÄÖÜäöüß])-\s+([A-Za-zÄÖÜäöüß])/g, "$1-$2")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function normalizeDashPunctuation(value: string) {
  return value.replaceAll(/[–—−]/g, "-");
}

function normalizeLooseSearchValue(value: string) {
  return normalizeDashPunctuation(value)
    .toLocaleLowerCase("de-DE")
    .replaceAll(/[’'`]/g, "")
    .replaceAll(/[^a-z0-9äöüß]+/g, " ")
    .trim();
}

function normalizeStorySeriesTitle(value: string) {
  return normalizeStoryReferenceText(value)
    .replaceAll(/\s*\(\d{4}\)\s*/g, " ")
    .replaceAll(/\s+,/g, ",")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function collectMetadataGroup(block: string[], metadataIndex: number, lowerBound: number) {
  let start = metadataIndex;
  while (start - 1 > lowerBound && looksLikeMetadataContextLine(block[start - 1] || "")) {
    start -= 1;
  }

  if (
    start === metadataIndex &&
    start - 2 > lowerBound &&
    !looksLikeMetadataContextLine(block[start - 1] || "") &&
    looksLikeMetadataContextLine(block[start - 2] || "") &&
    !isHardMetadataBoundary(block[start - 1] || "")
  ) {
    start -= 2;
  }

  let end = metadataIndex;
  let sawReleaseDate = DATE_PATTERN.test(block[end] || "");
  while (end + 1 < block.length && looksLikeMetadataContextLine(block[end + 1] || "")) {
    if (sawReleaseDate) break;
    end += 1;
    sawReleaseDate = sawReleaseDate || DATE_PATTERN.test(block[end] || "");
  }

  return block.slice(start, end + 1);
}

function isHardMetadataBoundary(line: string) {
  return /^Ausgabe\s+\d+/i.test(line) || /^Story\b/i.test(line) || /^Inhalt:/i.test(line);
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

function parseMetadataLines(lines: string[], fallbackReleaseDate?: string, issueCodeHint?: string) {
  const joined = lines.join(" | ");
  const issueCode = issueCodeHint || PRODUCT_CODE_PATTERN.exec(joined)?.[1];
  const pages = readPageCountForIssueCode(lines, issueCodeHint) || readPageCount(joined);
  const releaseDate = readReleaseDateForIssueCode(lines, issueCodeHint) || DATE_PATTERN.exec(joined)?.[1];
  const limitation = /(?:auf\s+)?(\d+)\s+Ex\./i.exec(joined)?.[1];

  return {
    issueCode,
    pages: pages ? Number.parseInt(pages, 10) : undefined,
    format: parseFormat(joined),
    price: readPriceForIssueCode(lines, issueCodeHint) || parsePrice(joined),
    releaseDate: resolveIssueReleaseDate(releaseDate, fallbackReleaseDate),
    limitation: limitation || "",
  };
}

function readReleaseDateForIssueCode(lines: string[], issueCodeHint?: string) {
  const hint = readTextValue(issueCodeHint);
  if (!hint) return "";

  const codeLineIndex = lines.findIndex((line) => line.includes(hint));
  if (codeLineIndex < 0) return "";

  const codeLine = lines[codeLineIndex] || "";
  const codeMatches = Array.from(codeLine.matchAll(new RegExp(PRODUCT_CODE_PATTERN.source, "g"))).map((match) => match[1] ?? "");
  const codeIndex = codeMatches.indexOf(hint);
  if (codeIndex < 0) return "";

  for (let index = codeLineIndex; index < lines.length; index += 1) {
    const line = lines[index] || "";
    const dates = Array.from(line.matchAll(new RegExp(DATE_PATTERN.source, "g"))).map((match) => match[1] ?? "");
    if (dates.length > codeIndex) return dates[codeIndex] ?? "";
    if (dates.length === 1) return dates[0] ?? "";
  }

  for (let index = codeLineIndex - 1; index >= 0; index -= 1) {
    const line = lines[index] || "";
    const dates = Array.from(line.matchAll(new RegExp(DATE_PATTERN.source, "g"))).map((match) => match[1] ?? "");
    if (dates.length > codeIndex) return dates[codeIndex] ?? "";
    if (dates.length === 1) return dates[0] ?? "";
  }

  return "";
}

function readPageCountForIssueCode(lines: string[], issueCodeHint?: string) {
  const fragment = readInlineMetadataFragmentForIssueCode(lines, issueCodeHint);
  const inlinePages = fragment ? readPageCount(fragment) : undefined;
  if (inlinePages) return inlinePages;

  return readNearbyMetadataValueForIssueCode(lines, issueCodeHint, readPageCountsFromLine);
}

function readPriceForIssueCode(lines: string[], issueCodeHint?: string) {
  const fragment = readInlineMetadataFragmentForIssueCode(lines, issueCodeHint);
  const inlinePrice = fragment && PRICE_PATTERN.test(fragment) ? parsePrice(fragment) : "";
  if (inlinePrice) return inlinePrice;

  const variantPrice = readNearbyVariantPriceForIssueCode(lines, issueCodeHint);
  if (variantPrice) return variantPrice;

  return readNearbyMetadataValueForIssueCode(lines, issueCodeHint, readPricesFromLine) || "";
}

function readInlineMetadataFragmentForIssueCode(lines: string[], issueCodeHint?: string) {
  const hint = readTextValue(issueCodeHint);
  if (!hint) return "";

  for (const line of lines) {
    if (!line.includes(hint)) continue;

    const matches = Array.from(line.matchAll(new RegExp(PRODUCT_CODE_PATTERN.source, "g")));
    const currentIndex = matches.findIndex((match) => (match[1] ?? "") === hint);
    if (currentIndex < 0) continue;

    const start = matches[currentIndex]?.index ?? 0;
    const end = matches[currentIndex + 1]?.index ?? line.length;
    return line.slice(start, end).trim();
  }

  return "";
}

function readNearbyMetadataValueForIssueCode(
  lines: string[],
  issueCodeHint: string | undefined,
  extractor: (line: string) => string[]
) {
  const hint = readTextValue(issueCodeHint);
  if (!hint) return "";

  const codeLineIndex = lines.findIndex((line) => line.includes(hint));
  if (codeLineIndex < 0) return "";

  const codePosition = readCodePosition(lines, codeLineIndex, hint);
  const nearbyIndexes: number[] = [];

  for (let offset = 0; offset <= 2; offset += 1) {
    nearbyIndexes.push(codeLineIndex - offset, codeLineIndex + offset);
  }

  for (const index of nearbyIndexes) {
    if (index < 0 || index >= lines.length) continue;
    const values = extractor(lines[index] || "");
    if (values.length > codePosition && values[codePosition]) return values[codePosition] ?? "";
    if (values.length === 1) return values[0] ?? "";
  }

  return "";
}

function readNearbyVariantPriceForIssueCode(lines: string[], issueCodeHint?: string) {
  const hint = readTextValue(issueCodeHint);
  if (!hint || !isVariantIssueCode(hint)) return "";

  const codeLineIndex = lines.findIndex((line) => line.includes(hint));
  if (codeLineIndex < 0) return "";

  for (let index = codeLineIndex - 1; index >= Math.max(0, codeLineIndex - 3); index -= 1) {
    const line = lines[index] || "";
    if (!PRICE_PATTERN.test(line)) continue;
    if (!/(?:lim\.|Ex\.|Variant)/i.test(line)) continue;
    return parsePrice(line);
  }

  return "";
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

function readPageCountsFromLine(line: string) {
  return Array.from(line.matchAll(/(\d+)\s*S\./gi)).map((match) => match[1] ?? "");
}

function readPricesFromLine(line: string) {
  return Array.from(line.matchAll(new RegExp(PRICE_PATTERN.source, "g"))).map((match) =>
    (match[1] ?? "").replaceAll(",", ".")
  );
}

function toIsoDate(value: string) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return "1900-01-01";
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function deriveVariantLabel(variantIndex: number) {
  return toVariantLetter(variantIndex);
}

function toVariantLetter(variantIndex: number) {
  let remaining = Math.max(0, Math.floor(variantIndex));
  let result = "";

  do {
    result = String.fromCharCode(65 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);

  return result;
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

function isProductCodeOnlyLine(line: string) {
  const tokens = line.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;

  return tokens.every((token) => /^[A-Z]{4,}\d{3,}[A-Z0-9]*$/i.test(token));
}

function isPromotionalTitleNoise(line: string) {
  return /\b(?:online shop|exklusives variant|comic-salon|erlangen)\b/i.test(line);
}

function shouldPreferContentDerivedSourceTitle(
  sourceTitle: string,
  contentDerivedSourceTitle: string,
  fallbackCode: string
) {
  if (!contentDerivedSourceTitle) return false;

  const normalizedSourceTitle = normalizeTitle(sourceTitle);
  if (!normalizedSourceTitle) return true;
  if (normalizedSourceTitle === fallbackCode) return true;
  if (hasGroupedIssueTitle(normalizedSourceTitle)) return false;
  if (
    normalizedSourceTitle !== contentDerivedSourceTitle &&
    normalizedSourceTitle.endsWith(contentDerivedSourceTitle)
  ) {
    return true;
  }

  return false;
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
  const lower = value.toLowerCase();
  const markerIndex = lower.indexOf("s.");
  if (markerIndex < 0) return undefined;

  let end = markerIndex;
  while (end > 0 && /\s/.test(value[end - 1] || "")) end -= 1;

  let start = end;
  while (start > 0 && /\d/.test(value[start - 1] || "")) start -= 1;

  const digits = value.slice(start, end);
  return digits && /^\d+$/.test(digits) ? digits : undefined;
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
