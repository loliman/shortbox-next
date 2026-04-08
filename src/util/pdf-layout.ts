import type {
  PdfLayoutBlock,
  PdfLayoutRow,
  PdfLayoutTextItem,
} from "../types/pdf-layout";

export interface PdfStyledTextRun {
  text: string;
  fillColor?: string;
  fontName?: string;
}

export function clusterPdfTextRows(
  items: PdfLayoutTextItem[],
  options?: {
    yTolerance?: number;
    xGapTolerance?: number;
  }
) {
  const yTolerance = options?.yTolerance ?? 2.5;
  const xGapTolerance = options?.xGapTolerance ?? 36;
  const sortedItems = [...items].sort((left, right) => right.y - left.y || left.x - right.x);
  const rows: Array<{ keyY: number; items: PdfLayoutTextItem[] }> = [];

  for (const item of sortedItems) {
    const targetRow = rows.find((row) => Math.abs(row.keyY - item.y) <= yTolerance);
    if (targetRow) {
      targetRow.items.push(item);
      continue;
    }

    rows.push({ keyY: item.y, items: [item] });
  }

  return rows
    .flatMap((row) => splitPdfRowSegments(row.items, xGapTolerance).map((segment) => buildPdfLayoutRow(segment)))
    .sort((left, right) => right.y - left.y || left.xMin - right.xMin);
}

export function clusterPdfRowsToBlocks(
  rows: PdfLayoutRow[],
  options?: {
    verticalGapTolerance?: number;
    horizontalGapTolerance?: number;
  }
) {
  const verticalGapTolerance = options?.verticalGapTolerance ?? 18;
  const horizontalGapTolerance = options?.horizontalGapTolerance ?? 42;
  const sortedRows = [...rows].sort((left, right) => right.y - left.y || left.xMin - right.xMin);
  const blocks: PdfLayoutBlock[] = [];

  for (const row of sortedRows) {
    const targetBlock = blocks.find((block) =>
      shouldAttachRowToBlock(block, row, verticalGapTolerance, horizontalGapTolerance)
    );

    if (!targetBlock) {
      blocks.push(buildPdfLayoutBlock([row]));
      continue;
    }

    targetBlock.rows.push(row);
    retallyPdfLayoutBlock(targetBlock);
  }

  return blocks.sort((left, right) => right.yTop - left.yTop || left.xMin - right.xMin);
}

export function applyPdfTextRunStylesToRows(
  rows: PdfLayoutRow[],
  textRuns: PdfStyledTextRun[]
) {
  const styledRows: PdfLayoutRow[] = [];
  let runIndex = 0;

  for (const row of rows) {
    const matchedRuns = matchTextRunsToComparableText(textRuns, runIndex, row.text);
    if (!matchedRuns) {
      const exactRunMatch = findExactTextRunMatch(textRuns, row.text);
      if (exactRunMatch) {
        styledRows.push({
          ...row,
          items: [
            {
              text: row.text,
              x: row.xMin,
              y: row.y,
              width: row.xMax - row.xMin,
              height: row.height,
              fontName: exactRunMatch.fontName || row.items[0]?.fontName,
              fillColor: exactRunMatch.fillColor,
            },
          ],
        });
      } else {
        styledRows.push(row);
      }
      continue;
    }

    styledRows.push({
      ...row,
      items: splitLayoutSpanByRuns({
        text: row.text,
        x: row.xMin,
        y: row.y,
        width: row.xMax - row.xMin,
        height: row.height,
        fallbackFontName: row.items[0]?.fontName,
        runs: matchedRuns.runs,
      }),
    });
    runIndex = matchedRuns.nextRunIndex;
  }

  return styledRows;
}

function buildPdfLayoutRow(items: PdfLayoutTextItem[]): PdfLayoutRow {
  const sortedItems = [...items].sort((left, right) => left.x - right.x);
  const xMin = Math.min(...sortedItems.map((item) => item.x));
  const xMax = Math.max(...sortedItems.map((item) => item.x + item.width));
  const y = average(sortedItems.map((item) => item.y));
  const height = Math.max(...sortedItems.map((item) => item.height));

  return {
    text: joinPdfRowText(sortedItems),
    items: sortedItems,
    xMin,
    xMax,
    y,
    height,
  };
}

function splitPdfRowSegments(items: PdfLayoutTextItem[], xGapTolerance: number) {
  const sortedItems = [...items].sort((left, right) => left.x - right.x);
  const segments: PdfLayoutTextItem[][] = [];
  let current: PdfLayoutTextItem[] = [];

  for (const item of sortedItems) {
    const previous = current[current.length - 1];
    if (!previous) {
      current = [item];
      continue;
    }

    const gap = item.x - (previous.x + previous.width);
    if (gap > xGapTolerance) {
      segments.push(current);
      current = [item];
      continue;
    }

    current.push(item);
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

function buildPdfLayoutBlock(rows: PdfLayoutRow[]): PdfLayoutBlock {
  const block: PdfLayoutBlock = {
    text: "",
    rows: [...rows].sort((left, right) => right.y - left.y || left.xMin - right.xMin),
    xMin: 0,
    xMax: 0,
    yTop: 0,
    yBottom: 0,
  };
  retallyPdfLayoutBlock(block);
  return block;
}

function retallyPdfLayoutBlock(block: PdfLayoutBlock) {
  block.rows.sort((left, right) => right.y - left.y || left.xMin - right.xMin);
  block.xMin = Math.min(...block.rows.map((row) => row.xMin));
  block.xMax = Math.max(...block.rows.map((row) => row.xMax));
  block.yTop = Math.max(...block.rows.map((row) => row.y + row.height / 2));
  block.yBottom = Math.min(...block.rows.map((row) => row.y - row.height / 2));
  block.text = block.rows.map((row) => row.text).join("\n");
}

function shouldAttachRowToBlock(
  block: PdfLayoutBlock,
  row: PdfLayoutRow,
  verticalGapTolerance: number,
  horizontalGapTolerance: number
) {
    const lastRow = block.rows
      .sort((left, right) => left.y - right.y || left.xMin - right.xMin)[0];
    const verticalGap = Math.abs(lastRow.y - row.y);
    if (verticalGap > Math.max(verticalGapTolerance, Math.max(lastRow.height, row.height) * 1.75)) {
      return false;
    }

    const overlapsHorizontally =
      row.xMin <= block.xMax + horizontalGapTolerance
      && row.xMax >= block.xMin - horizontalGapTolerance;

    return overlapsHorizontally;
}

function joinPdfRowText(items: PdfLayoutTextItem[]) {
  const parts: string[] = [];

  for (const item of items) {
    const text = item.text.trim();
    if (!text) continue;

    if (parts.length === 0) {
      parts.push(text);
      continue;
    }

    const previous = parts[parts.length - 1] || "";
    if (/[(/-]$/.test(previous) || /^[,.;:!?)]/.test(text)) {
      parts[parts.length - 1] = `${previous}${text}`;
      continue;
    }

    parts.push(text);
  }

  return parts.join(" ").replaceAll(/\s+/g, " ").trim();
}

function matchTextRunsToComparableText(
  textRuns: PdfStyledTextRun[],
  startIndex: number,
  targetText: string
) {
  const comparableTargetText = normalizeComparableText(targetText);
  if (!comparableTargetText) return null;

  for (let candidateStartIndex = startIndex; candidateStartIndex < textRuns.length && candidateStartIndex < startIndex + 40; candidateStartIndex += 1) {
    let combinedText = "";
    const matchedRuns: PdfStyledTextRun[] = [];

    for (let index = candidateStartIndex; index < textRuns.length && matchedRuns.length < 8; index += 1) {
      const run = textRuns[index];
      if (!run?.text) continue;

      combinedText = normalizeComparableText([combinedText, run.text].filter(Boolean).join(" "));
      matchedRuns.push(run);

      if (combinedText === comparableTargetText) {
        return {
          runs: matchedRuns,
          nextRunIndex: index + 1,
        };
      }

      if (combinedText.length >= comparableTargetText.length) break;
    }
  }

  return null;
}

function splitLayoutSpanByRuns(input: {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fallbackFontName?: string;
  runs: PdfStyledTextRun[];
}) {
  if (input.runs.length <= 1) {
    return [
      {
        text: input.text,
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
        fontName: input.runs[0]?.fontName || input.fallbackFontName,
        fillColor: input.runs[0]?.fillColor,
      },
    ] satisfies PdfLayoutTextItem[];
  }

  const totalLength = input.runs.reduce((sum, run) => sum + Math.max(run.text.length, 1), 0) || 1;
  let currentX = input.x;

  return input.runs.map((run, index) => {
    const isLast = index === input.runs.length - 1;
    const proportionalWidth = isLast
      ? Math.max(0, input.x + input.width - currentX)
      : input.width * (Math.max(run.text.length, 1) / totalLength);
    const segment: PdfLayoutTextItem = {
      text: run.text,
      x: currentX,
      y: input.y,
      width: proportionalWidth,
      height: input.height,
      fontName: run.fontName || input.fallbackFontName,
      fillColor: run.fillColor,
    };
    currentX += proportionalWidth;
    return segment;
  });
}

function findExactTextRunMatch(textRuns: PdfStyledTextRun[], targetText: string) {
  const comparableTargetText = normalizeComparableText(targetText);
  if (!comparableTargetText) return null;

  return (
    textRuns.find((run) => normalizeComparableText(run.text) === comparableTargetText)
    ?? null
  );
}

function normalizeComparableText(value: string) {
  return value
    .replaceAll(/(?:\b[A-ZÄÖÜ]\s+){2,}[A-ZÄÖÜ]\b/g, (match) => match.replaceAll(/\s+/g, ""))
    .replaceAll(/\s+/g, " ")
    .trim();
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
