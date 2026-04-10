import type { PdfLayoutBlock, PdfLayoutPage, PdfLayoutRow } from "../types/pdf-layout";
import type {
  PreviewImportLayoutAnchor,
  PreviewImportLayoutPageAnalysis,
} from "../types/preview-import-layout";

const PRODUCT_CODE_PATTERN = /\b([A-Z][A-Z0-9]{3,}\d{3,}[A-Z]?)\b/;

export function analyzePreviewImportLayoutPages(pages: PdfLayoutPage[]) {
  return pages
    .filter(isNeuheitenLayoutPage)
    .map((page) => analyzePreviewImportLayoutPage(page))
    .filter((analysis) => analysis.anchors.length > 0);
}

export function analyzePreviewImportLayoutPage(page: PdfLayoutPage): PreviewImportLayoutPageAnalysis {
  const metadataBlocks = page.blocks.filter(isMetadataBlock);
  const usesMultiColumnPattern = detectsMultiColumnMetadataPattern(metadataBlocks);
  const stackedLayoutSplitY = detectStackedTopAndBottomSplit(page, metadataBlocks);
  const anchors = metadataBlocks
    .flatMap((metadataBlock) => splitMetadataBlocks(page, metadataBlock))
    .map((metadataBlock) => buildLayoutAnchor(page, metadataBlock, stackedLayoutSplitY))
    .filter((anchor): anchor is PreviewImportLayoutAnchor => anchor !== null);

  return {
    page,
    anchors: inheritSiblingContext(anchors),
    usesMultiColumnPattern,
  };
}

export function isNeuheitenLayoutPage(page: PdfLayoutPage) {
  return page.rows.some((row) => containsNeuheitenHeading(row.text));
}

function buildLayoutAnchor(
  page: PdfLayoutPage,
  metadataBlock: PdfLayoutBlock,
  stackedLayoutSplitY: number | null = null
) {
  const issueCode = PRODUCT_CODE_PATTERN.exec(metadataBlock.text)?.[1] ?? "";
  if (!issueCode) return null;

  const contentRows = selectNearestContentRows(page, metadataBlock, stackedLayoutSplitY);
  const contentRow = contentRows[0] ?? null;
  const contentText = contentRows.map((row) => row.text).join(" ").trim();
  const titleRows = selectTitleRows(page, metadataBlock, contentRow, stackedLayoutSplitY);
  const titleText = titleRows.map((row) => row.text).join(" ").trim();

  return {
    issueCode,
    metadataBlock,
    contentRow,
    contentRows,
    contentText,
    titleRows,
    titleText,
    confidence: scoreLayoutAnchorConfidence(titleText, contentRow),
  };
}

function isMetadataBlock(block: PdfLayoutBlock) {
  return PRODUCT_CODE_PATTERN.test(block.text)
    && /€|\b(?:Softcover|Hardcover|Heft|SC|HC)\b|\d{2}\.\d{2}\.\d{4}/i.test(block.text);
}

function selectNearestContentRow(
  page: PdfLayoutPage,
  metadataBlock: PdfLayoutBlock,
  stackedLayoutSplitY: number | null
) {
  const candidates = page.rows
    .filter((row) => /^Inhalt:/i.test(row.text))
    .filter((row) => row.y > metadataBlock.yTop)
    .filter((row) => isRowInSameVerticalZone(row, metadataBlock, stackedLayoutSplitY))
    .map((row) => ({
      row,
      overlap: readHorizontalOverlap(row, metadataBlock),
      distance: row.y - metadataBlock.yTop,
      centerDistance: Math.abs(readCenterX(row) - readCenterX(metadataBlock)),
      inColumnBand: isWithinColumnBand(row, metadataBlock),
    }))
    .filter((candidate) => candidate.distance <= 420);

  const prioritizedCandidates = candidates.some((candidate) => candidate.inColumnBand)
    ? candidates.filter((candidate) => candidate.inColumnBand)
    : candidates;

  const selectedRow = prioritizedCandidates
    .sort(
      (left, right) =>
        right.overlap - left.overlap
        || left.centerDistance - right.centerDistance
        || left.distance - right.distance
    )[0]?.row ?? null;

  return selectedRow ? sliceRowToBlockBand(selectedRow, metadataBlock) : null;
}

function selectNearestContentRows(
  page: PdfLayoutPage,
  metadataBlock: PdfLayoutBlock,
  stackedLayoutSplitY: number | null
) {
  const firstRow = selectNearestContentRow(page, metadataBlock, stackedLayoutSplitY);
  if (!firstRow) return [];

  const sortedRows = [...page.rows].sort((left, right) => right.y - left.y || left.xMin - right.xMin);
  const firstIndex = sortedRows.findIndex((row) => row.y === firstRow.y && row.text === firstRow.text);
  if (firstIndex < 0) return [firstRow];

  const rows = [firstRow];
  let currentText = firstRow.text;
  let previousY = firstRow.y;

  for (let index = firstIndex + 1; index < sortedRows.length; index += 1) {
    const rawRow = sortedRows[index];
    if (!rawRow) continue;
    if (!isRowInSameVerticalZone(rawRow, metadataBlock, stackedLayoutSplitY)) break;
    const candidate = sliceRowToBlockBand(rawRow, metadataBlock);
    if (!candidate) continue;
    if (previousY - candidate.y > 34) break;
    if (!shouldContinueLayoutContent(currentText, candidate.text)) break;

    rows.push(candidate);
    currentText = `${currentText} ${candidate.text}`.trim();
    previousY = candidate.y;
  }

  return rows;
}

function selectTitleRows(
  page: PdfLayoutPage,
  metadataBlock: PdfLayoutBlock,
  contentRow: PdfLayoutRow | null,
  stackedLayoutSplitY: number | null
) {
  const titleCeiling = contentRow?.y ?? metadataBlock.yTop + 360;
  const titleSearchPadding = contentRow
    ? 120
    : isMetadataBlockInTopZone(metadataBlock, stackedLayoutSplitY)
      ? 360
      : 80;
  const titleFloor = metadataBlock.yTop;
  const titleRows = page.rows
    .filter((row) => row.y > titleFloor)
    .filter((row) => row.y < titleCeiling + titleSearchPadding)
    .filter((row) => isRowInSameVerticalZone(row, metadataBlock, stackedLayoutSplitY))
    .filter((row) => isTitleLikeRow(row))
    .filter((row) => {
      const overlap = readHorizontalOverlap(row, metadataBlock);
      const centerDistance = Math.abs(readCenterX(row) - readCenterX(metadataBlock));
      return overlap > 24 || centerDistance < 140 || isWithinColumnBand(row, metadataBlock);
    })
    .sort((left, right) => right.y - left.y || left.xMin - right.xMin)
    .map((row) => sliceRowToBlockBand(row, metadataBlock))
    .filter((row): row is PdfLayoutRow => row !== null)
    .filter((row) => isTitleLikeRow(row));

  if (titleRows.length > 1) return titleRows;
  if (titleRows.length === 1 && contentRow && isSelfContainedTitleRow(titleRows[0])) {
    return titleRows;
  }

  const fallbackTitleRows = page.rows
    .filter((row) => row.y > titleFloor)
    .filter((row) => row.y < titleCeiling + titleSearchPadding)
    .filter((row) => isRowInSameVerticalZone(row, metadataBlock, stackedLayoutSplitY))
    .filter((row) => isTitleLikeRow(row))
    .filter((row) => {
      const overlap = readHorizontalOverlap(row, metadataBlock);
      const centerDistance = Math.abs(readCenterX(row) - readCenterX(metadataBlock));
      return overlap > 0 || centerDistance < 220;
    })
    .sort((left, right) => right.y - left.y || left.xMin - right.xMin)
    .map((row) => sliceRowToBlockBandWithPadding(row, metadataBlock, 120))
    .filter((row): row is PdfLayoutRow => row !== null)
    .filter((row) => isTitleLikeRow(row));

  const selectedTitleRows = fallbackTitleRows.length > titleRows.length ? fallbackTitleRows : titleRows;
  if (selectedTitleRows.length > 0 || contentRow) {
    return selectedTitleRows;
  }

  const groupedIssueTitleRows = selectGroupedIssueFallbackTitleRows(page, metadataBlock, stackedLayoutSplitY);
  if (groupedIssueTitleRows.length > 0) {
    return groupedIssueTitleRows;
  }

  return selectBelowMetadataTitleRows(page, metadataBlock, stackedLayoutSplitY);
}

function isSelfContainedTitleRow(row: PdfLayoutRow | undefined) {
  const text = row?.text.trim() || "";
  if (!text) return false;

  return !/[&:\/-]\s*$/.test(text);
}

function isTitleLikeRow(row: PdfLayoutRow) {
  const text = row.text.trim();
  if (!text) return false;
  if (/^N E U H E I T E N$/i.test(text)) return false;
  if (/^N E U E(?:\s+N E U E)*$/i.test(text)) return false;
  if (/^SERIE(?:\s+SERIE)*$/i.test(text)) return false;
  if (/^Variant-Cover$/i.test(text)) return false;
  if (/^COVER FOLGT$/i.test(text)) return false;
  if (/^Vorläufiges Cover$/i.test(text)) return false;
  if (/^Story\b/i.test(text) || /^Zeichnungen\b/i.test(text) || /^Inhalt:/i.test(text)) return false;
  if (PRODUCT_CODE_PATTERN.test(text)) return false;
  if (/€|\d{2}\.\d{2}\.\d{4}/.test(text)) return false;

  const letters = text.replaceAll(/[^A-Za-zÄÖÜäöüß]/g, "");
  if (letters.length < 4) return false;
  const uppercaseLetters = letters.replaceAll(/[^A-ZÄÖÜ]/g, "").length;
  return uppercaseLetters / letters.length > 0.55;
}

function selectGroupedIssueFallbackTitleRows(
  page: PdfLayoutPage,
  metadataBlock: PdfLayoutBlock,
  stackedLayoutSplitY: number | null
) {
  const groupedTitleRow = page.rows
    .filter((row) => row.y > metadataBlock.yTop)
    .filter((row) => row.y < metadataBlock.yTop + 360)
    .filter((row) => isRowInSameVerticalZone(row, metadataBlock, stackedLayoutSplitY))
    .filter((row) => isTitleLikeRow(row))
    .filter((row) => /\b\d+[A-Za-z]?\s*\+\s*\d+[A-Za-z]?/.test(row.text))
    .sort((left, right) => left.y - right.y)[0];

  if (!groupedTitleRow) return [];

  const slicedRow = sliceRowToBlockBandWithPadding(groupedTitleRow, metadataBlock, 160);
  return slicedRow ? [slicedRow] : [];
}

function selectBelowMetadataTitleRows(
  page: PdfLayoutPage,
  metadataBlock: PdfLayoutBlock,
  stackedLayoutSplitY: number | null
) {
  const belowRows = page.rows
    .filter((row) => row.y < metadataBlock.yBottom)
    .filter((row) => row.y > metadataBlock.yBottom - 180)
    .filter((row) => isRowInSameVerticalZone(row, metadataBlock, stackedLayoutSplitY))
    .filter((row) => isTitleLikeRow(row))
    .filter((row) => {
      const overlap = readHorizontalOverlap(row, metadataBlock);
      const centerDistance = Math.abs(readCenterX(row) - readCenterX(metadataBlock));
      return overlap > 24 || centerDistance < 140 || isWithinColumnBand(row, metadataBlock);
    })
    .sort((left, right) => right.y - left.y || left.xMin - right.xMin)
    .map((row) => sliceRowToBlockBand(row, metadataBlock))
    .filter((row): row is PdfLayoutRow => row !== null)
    .filter((row) => isTitleLikeRow(row));

  return belowRows;
}

function readHorizontalOverlap(row: PdfLayoutRow | PdfLayoutBlock, block: PdfLayoutBlock) {
  return Math.max(0, Math.min(row.xMax, block.xMax) - Math.max(row.xMin, block.xMin));
}

function readCenterX(row: PdfLayoutRow | PdfLayoutBlock) {
  return row.xMin + (row.xMax - row.xMin) / 2;
}

function isWithinColumnBand(row: PdfLayoutRow, block: PdfLayoutBlock) {
  return row.xMin >= block.xMin - 90 && row.xMax <= block.xMax + 90;
}

function containsNeuheitenHeading(text: string) {
  return /(?:^|\s)N E U H E I T E N(?:\s|$)/i.test(text.trim());
}

function shouldContinueLayoutContent(currentText: string, nextText: string) {
  const normalizedCurrent = normalizeLayoutStoryText(currentText.replace(/^Inhalt:\s*/i, "").trim());
  const normalizedNext = normalizeLayoutStoryText(nextText);

  if (!normalizedNext) return false;
  if (/^Story\b/i.test(normalizedNext) || /^Zeichnungen\b/i.test(normalizedNext)) return false;
  if (/^Inhalt:/i.test(normalizedNext)) return false;
  if (PRODUCT_CODE_PATTERN.test(normalizedNext)) return false;
  if (/€|\d{2}\.\d{2}\.\d{4}|\b(?:Softcover|Hardcover|Heft|SC|HC)\b/i.test(normalizedNext)) return false;
  if (looksLikeNarrativeLayoutLine(normalizedNext)) return false;

  if (looksLikeMaterialLayoutContinuation(normalizedCurrent, normalizedNext)) return true;
  if (/[,:-]$/.test(normalizedCurrent)) return true;
  if (/\(\d{4}\)/.test(normalizedNext)) return true;
  if (/\b(?:Annual\s+\d+|\d+[A-Z]?(?:-\d+[A-Z]?)?)\b/i.test(normalizedNext)) return true;

  return false;
}

function looksLikeMaterialLayoutContinuation(currentText: string, nextText: string) {
  return /\bMaterial$/i.test(currentText) && /^aus\b/i.test(nextText);
}

function looksLikeNarrativeLayoutLine(value: string) {
  if (!value) return false;
  if (/^\d{4}\s+\S+/.test(value)) return true;
  if (!/\d/.test(value) && /\b(?:fantastische|Abenteuer|Heldin|Film|Fans|Neueinsteiger|repräsentativen)\b/i.test(value)) {
    return true;
  }

  return /[.!?]$/.test(value) && !/\b\d+[A-Z]?(?:-\d+[A-Z]?)?\b/.test(value);
}

function normalizeLayoutStoryText(value: string) {
  return value
    .replaceAll(/[–—−]/g, "-")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function detectsMultiColumnMetadataPattern(metadataBlocks: PdfLayoutBlock[]) {
  if (metadataBlocks.length < 2) return false;

  const sortedBlocks = [...metadataBlocks].sort((left, right) => left.xMin - right.xMin);
  return sortedBlocks.some((block, index) => {
    const nextBlock = sortedBlocks[index + 1];
    if (!nextBlock) return false;
    return nextBlock.xMin - block.xMax >= 24;
  });
}

function detectStackedTopAndBottomSplit(page: PdfLayoutPage, metadataBlocks: PdfLayoutBlock[]) {
  if (metadataBlocks.length < 3) return null;

  const sortedByVerticalPosition = [...metadataBlocks]
    .sort((left, right) => right.yTop - left.yTop || left.xMin - right.xMin);
  const topBlock = sortedByVerticalPosition[0];
  if (!topBlock) return null;

  const lowerBlocks = sortedByVerticalPosition
    .slice(1)
    .filter((block) => topBlock.yTop - block.yTop >= 70);
  if (lowerBlocks.length < 2) return null;

  const lowerPair = [...lowerBlocks]
    .sort((left, right) => right.yTop - left.yTop || left.xMin - right.xMin)
    .slice(0, 2)
    .sort((left, right) => left.xMin - right.xMin);
  const [leftLowerBlock, rightLowerBlock] = lowerPair;
  if (!leftLowerBlock || !rightLowerBlock) return null;

  const lowerBlocksAreSeparated = rightLowerBlock.xMin - leftLowerBlock.xMax >= 24;
  const topSpansBothLowerBlocks =
    topBlock.xMin <= leftLowerBlock.xMin + 36
    && topBlock.xMax >= rightLowerBlock.xMax - 36;
  const topIsWiderThanLowerColumns =
    readBlockWidth(topBlock) >= Math.max(readBlockWidth(leftLowerBlock), readBlockWidth(rightLowerBlock)) * 1.45;

  if (!lowerBlocksAreSeparated || (!topSpansBothLowerBlocks && !topIsWiderThanLowerColumns)) {
    return null;
  }

  const splitY = topBlock.yBottom - (topBlock.yBottom - Math.max(leftLowerBlock.yTop, rightLowerBlock.yTop)) / 2;
  return splitY > 0 && splitY < page.height ? splitY : null;
}

function isRowInSameVerticalZone(
  row: PdfLayoutRow,
  metadataBlock: PdfLayoutBlock,
  stackedLayoutSplitY: number | null
) {
  if (stackedLayoutSplitY == null) return true;
  const metadataIsInTopZone = isMetadataBlockInTopZone(metadataBlock, stackedLayoutSplitY);
  return metadataIsInTopZone ? row.y > stackedLayoutSplitY : row.y <= stackedLayoutSplitY;
}

function isMetadataBlockInTopZone(
  metadataBlock: Pick<PdfLayoutBlock, "yTop">,
  stackedLayoutSplitY: number | null
) {
  return stackedLayoutSplitY != null && metadataBlock.yTop > stackedLayoutSplitY;
}

function readBlockWidth(block: Pick<PdfLayoutBlock, "xMin" | "xMax">) {
  return block.xMax - block.xMin;
}

function sliceRowToBlockBand(row: PdfLayoutRow, block: PdfLayoutBlock) {
  return sliceRowToBlockBandWithPadding(row, block, 36);
}

function sliceRowToBlockBandWithPadding(
  row: PdfLayoutRow,
  block: PdfLayoutBlock,
  padding: number
) {
  const xMin = block.xMin - padding;
  const xMax = block.xMax + padding;
  if (row.items.length === 0) {
    const overlaps = row.xMax >= xMin && row.xMin <= xMax;
    return overlaps ? row : null;
  }
  const items = row.items.filter((item) => {
    const itemXMin = item.x;
    const itemXMax = item.x + item.width;
    const center = itemXMin + item.width / 2;
    return (
      center >= xMin
      && center <= xMax
      && itemXMax >= xMin
      && itemXMin <= xMax
    );
  });

  if (items.length === 0) return null;

  const slicedRow: PdfLayoutRow = {
    text: joinRowItems(items),
    items,
    xMin: Math.min(...items.map((item) => item.x)),
    xMax: Math.max(...items.map((item) => item.x + item.width)),
    y: row.y,
    height: row.height,
  };

  return slicedRow.text ? slicedRow : null;
}

function joinRowItems(items: PdfLayoutRow["items"]) {
  return [...items]
    .sort((left, right) => left.x - right.x)
    .reduce<string[]>((parts, item) => {
      const text = item.text.trim();
      if (!text) return parts;
      if (parts.length === 0) return [text];

      const previous = parts[parts.length - 1] || "";
      if (/[(/-]$/.test(previous) || /^[,.;:!?)]/.test(text)) {
        parts[parts.length - 1] = `${previous}${text}`;
        return parts;
      }

      parts.push(text);
      return parts;
    }, [])
    .join(" ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function scoreLayoutAnchorConfidence(titleText: string, contentRow: PdfLayoutRow | null) {
  let score = 0;
  if (titleText && !PRODUCT_CODE_PATTERN.test(titleText)) score += 2;
  if (contentRow?.text) score += 2;
  if (/:\s*$/.test(titleText) || /\b\d+[A-Z]?\b/.test(titleText)) score += 1;
  return score;
}

function splitMetadataBlocks(page: PdfLayoutPage, metadataBlock: PdfLayoutBlock) {
  const rowsWithCodes = metadataBlock.rows.filter((row) => PRODUCT_CODE_PATTERN.test(row.text));
  if (rowsWithCodes.length === 0) {
    return [metadataBlock];
  }

  return rowsWithCodes.flatMap((row) => {
    const rowCodes = Array.from(row.text.matchAll(new RegExp(PRODUCT_CODE_PATTERN.source, "g")))
      .map((match) => match[1] ?? "")
      .filter(Boolean);

    if (rowCodes.length === 0) return [];

    return rowCodes.map((code) => {
      const slicedRow = sliceRowToIssueCode(row, code);
      const rows = [
        slicedRow ?? row,
        ...metadataBlock.rows.filter(
          (candidate) =>
            candidate !== row
            && !PRODUCT_CODE_PATTERN.test(candidate.text)
            && candidate.y < row.y + 12
            && candidate.y > row.y - 12
            && overlapsBand(candidate, slicedRow ?? row)
        ),
      ];

      return buildPdfLayoutBlock(rows);
    });
  });
}

function inheritSiblingContext(anchors: PreviewImportLayoutAnchor[]) {
  return anchors.map((anchor) => {
    if (anchor.titleRows.length > 0 || anchor.contentRow) return anchor;

    const siblingCandidates = anchors
      .filter((candidate) => candidate !== anchor)
      .filter((candidate) => candidate.titleRows.length > 0 || candidate.contentRow);

    const overlappingSibling = siblingCandidates
      .filter((candidate) => readHorizontalBlockOverlap(candidate.metadataBlock, anchor.metadataBlock) > 40)
      .sort((left, right) => {
        const leftDistance = Math.abs(left.metadataBlock.yTop - anchor.metadataBlock.yTop);
        const rightDistance = Math.abs(right.metadataBlock.yTop - anchor.metadataBlock.yTop);
        return leftDistance - rightDistance;
      })[0];

    const nearestEditionSibling = overlappingSibling
      ? null
      : looksLikeEditionOnlyMetadata(anchor.metadataBlock.text)
        ? siblingCandidates
          .sort((left, right) => {
            const leftDistance =
              Math.abs(readBlockCenterX(left.metadataBlock) - readBlockCenterX(anchor.metadataBlock))
              + Math.abs(left.metadataBlock.yTop - anchor.metadataBlock.yTop);
            const rightDistance =
              Math.abs(readBlockCenterX(right.metadataBlock) - readBlockCenterX(anchor.metadataBlock))
              + Math.abs(right.metadataBlock.yTop - anchor.metadataBlock.yTop);
            return leftDistance - rightDistance;
          })[0]
        : null;

    const sibling = overlappingSibling ?? nearestEditionSibling;

    if (!sibling) return anchor;

    const titleRows = sibling.titleRows.map((row) => sliceRowToBlockBand(row, anchor.metadataBlock)).filter(
      (row): row is PdfLayoutRow => row !== null
    );
    const contentRow = sibling.contentRow
      ? sliceRowToBlockBand(sibling.contentRow, anchor.metadataBlock) ?? sibling.contentRow
      : null;
    const contentRows = sibling.contentRows
      .map((row) => sliceRowToBlockBand(row, anchor.metadataBlock) ?? row)
      .filter((row): row is PdfLayoutRow => row !== null);
    const contentText = contentRows.map((row) => row.text).join(" ").trim();
    const titleText = titleRows.map((row) => row.text).join(" ").trim();

    return {
      ...anchor,
      titleRows,
      contentRow,
      contentRows,
      contentText,
      titleText,
      confidence: scoreLayoutAnchorConfidence(titleText, contentRow),
    };
  });
}

function sliceRowToIssueCode(row: PdfLayoutRow, issueCode: string) {
  if (row.items.length === 0) return null;

  const codeItemIndex = row.items.findIndex((item) => item.text.includes(issueCode));
  if (codeItemIndex < 0) return null;

  const codeItem = row.items[codeItemIndex];
  if (!codeItem) return null;

  const codeXMin = codeItem.x - 24;
  const codeXMax = codeItem.x + codeItem.width + 220;
  const items = row.items.filter((item) => {
    const center = item.x + item.width / 2;
    return center >= codeXMin && center <= codeXMax;
  });

  if (items.length === 0) return null;

  return {
    text: joinRowItems(items),
    items,
    xMin: Math.min(...items.map((item) => item.x)),
    xMax: Math.max(...items.map((item) => item.x + item.width)),
    y: row.y,
    height: row.height,
  };
}

function buildPdfLayoutBlock(rows: PdfLayoutRow[]): PdfLayoutBlock {
  const sortedRows = [...rows].sort((left, right) => right.y - left.y || left.xMin - right.xMin);
  return {
    text: sortedRows.map((row) => row.text).join("\n"),
    rows: sortedRows,
    xMin: Math.min(...sortedRows.map((row) => row.xMin)),
    xMax: Math.max(...sortedRows.map((row) => row.xMax)),
    yTop: Math.max(...sortedRows.map((row) => row.y + row.height / 2)),
    yBottom: Math.min(...sortedRows.map((row) => row.y - row.height / 2)),
  };
}

function overlapsBand(row: PdfLayoutRow, band: Pick<PdfLayoutRow, "xMin" | "xMax">) {
  return row.xMax >= band.xMin - 24 && row.xMin <= band.xMax + 24;
}

function readHorizontalBlockOverlap(left: PdfLayoutBlock, right: PdfLayoutBlock) {
  return Math.max(0, Math.min(left.xMax, right.xMax) - Math.max(left.xMin, right.xMin));
}

function looksLikeEditionOnlyMetadata(text: string) {
  return /\b(?:Hardcover|HC|Schuber|Premium Edition|lim\.|auf \d+\s*Ex\.)\b/i.test(text);
}

function readBlockCenterX(block: PdfLayoutBlock) {
  return block.xMin + (block.xMax - block.xMin) / 2;
}
