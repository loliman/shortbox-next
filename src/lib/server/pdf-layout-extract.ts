import "server-only";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";
import {
  applyPdfTextRunStylesToRows,
  clusterPdfRowsToBlocks,
  clusterPdfTextRows,
  type PdfStyledTextRun,
} from "../../util/pdf-layout";
import type { PdfLayoutDocument, PdfLayoutPage, PdfLayoutTextItem } from "../../types/pdf-layout";

Object.defineProperty(pdfjs.PDFWorker, "_setupFakeWorkerGlobal", {
  value: Promise.resolve(pdfjsWorker.WorkerMessageHandler),
  configurable: true,
});

export async function extractPdfLayoutFromBuffer(buffer: ArrayBuffer): Promise<PdfLayoutDocument> {
  const data = new Uint8Array(buffer);
  const documentOptions = {
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  } as Parameters<typeof pdfjs.getDocument>[0];

  const document = await pdfjs.getDocument(documentOptions).promise;
  const pages: PdfLayoutPage[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const operatorList = await page.getOperatorList();
    const textRuns = extractStyledTextRuns(operatorList as { fnArray: number[]; argsArray: unknown[] });
    const items = toPdfLayoutTextItems(
      content.items as Array<{
        str?: string;
        width?: number;
        height?: number;
        transform?: number[];
        fontName?: string;
      }>,
      textRuns
    );
    const rows = applyPdfTextRunStylesToRows(clusterPdfTextRows(items), textRuns);
    const blocks = clusterPdfRowsToBlocks(rows);

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      items,
      rows,
      blocks,
    });
  }

  return { pages };
}

function toPdfLayoutTextItems(
  items: Array<{ str?: string; width?: number; height?: number; transform?: number[]; fontName?: string }>,
  textRuns: Array<{ text: string; fillColor?: string; fontName?: string }>
) {
  const result: PdfLayoutTextItem[] = [];
  let runIndex = 0;

  for (const item of items) {
    const text = typeof item.str === "string" ? item.str.trim() : "";
    if (!text) continue;

    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = typeof transform[4] === "number" ? transform[4] : 0;
    const y = typeof transform[5] === "number" ? transform[5] : 0;
    const width = typeof item.width === "number" ? item.width : 0;
    const derivedHeight = Math.abs(typeof transform[3] === "number" ? transform[3] : 0);
    const height = typeof item.height === "number" && item.height > 0
      ? item.height
      : derivedHeight || 0;
    const matchedRuns = matchTextRunsToItem(textRuns, runIndex, text);
    if (matchedRuns) {
      const splitItems = splitItemByRuns({
        text,
        x,
        y,
        width,
        height,
        fallbackFontName: item.fontName,
        runs: matchedRuns.runs,
      });
      result.push(...splitItems);
      runIndex = matchedRuns.nextRunIndex;
      continue;
    }

    result.push({
      text,
      x,
      y,
      width,
      height,
      fontName: item.fontName,
    });
  }

  return result;
}

function extractStyledTextRuns(
  operatorList: { fnArray: number[]; argsArray: unknown[] }
): PdfStyledTextRun[] {
  let currentFillColor: string | undefined;
  let currentFontName: string | undefined;
  const runs: PdfStyledTextRun[] = [];

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    const fn = operatorList.fnArray[index];
    const args = operatorList.argsArray[index];

    if (fn === pdfjs.OPS.setFillRGBColor) {
      currentFillColor = normalizeOperatorColor(args);
      continue;
    }

    if (fn === pdfjs.OPS.setFillGray) {
      currentFillColor = normalizeOperatorGray(args);
      continue;
    }

    if (fn === pdfjs.OPS.setFillColor) {
      currentFillColor = normalizeOperatorColor(args);
      continue;
    }

    if (fn === pdfjs.OPS.setFillColorN) {
      currentFillColor = normalizeOperatorColor(args);
      continue;
    }

    if (fn === pdfjs.OPS.setFillCMYKColor) {
      currentFillColor = normalizeOperatorColor(args);
      continue;
    }

    if (fn === pdfjs.OPS.setFont) {
      currentFontName = typeof args?.[0] === "string" ? args[0] : currentFontName;
      continue;
    }

    if (
      fn !== pdfjs.OPS.showText
      && fn !== pdfjs.OPS.showSpacedText
      && fn !== pdfjs.OPS.nextLineShowText
      && fn !== pdfjs.OPS.nextLineSetSpacingShowText
    ) {
      continue;
    }

    const renderedText = readRenderedTextFromOperator(fn, args);
    const normalizedText = normalizeComparableText(renderedText);
    if (!normalizedText) continue;
    runs.push({
      text: normalizedText,
      fillColor: currentFillColor,
      fontName: currentFontName,
    });
  }

  return runs;
}

function readRenderedTextFromOperator(fn: number, args: unknown) {
  if (fn === pdfjs.OPS.showText || fn === pdfjs.OPS.showSpacedText) {
    return readRenderedTextArg(Array.isArray(args) ? args[0] : args);
  }

  if (fn === pdfjs.OPS.nextLineShowText) {
    return typeof args?.[0] === "string" ? args[0] : readRenderedTextArg(args?.[0]);
  }

  if (fn === pdfjs.OPS.nextLineSetSpacingShowText) {
    return typeof args?.[2] === "string" ? args[2] : readRenderedTextArg(args?.[2]);
  }

  return "";
}

function readRenderedTextArg(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  return value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (typeof entry === "number") return "";
      if (entry && typeof entry === "object" && "unicode" in entry) {
        return typeof entry.unicode === "string" ? entry.unicode : "";
      }
      return "";
    })
    .join("");
}

function normalizeComparableText(value: string) {
  return value.replaceAll(/\s+/g, " ").trim();
}

function matchTextRunsToItem(
  textRuns: Array<{ text: string; fillColor?: string; fontName?: string }>,
  startIndex: number,
  itemText: string
) {
  const comparableItemText = normalizeComparableText(itemText);
  if (!comparableItemText) return null;

  let combinedText = "";
  const matchedRuns: Array<{ text: string; fillColor?: string; fontName?: string }> = [];

  for (let index = startIndex; index < textRuns.length && matchedRuns.length < 5; index += 1) {
    const run = textRuns[index];
    if (!run?.text) continue;

    combinedText = combineComparableTexts(combinedText, run.text);
    matchedRuns.push(run);

    if (combinedText === comparableItemText) {
      return {
        runs: matchedRuns,
        nextRunIndex: index + 1,
      };
    }

    if (combinedText.length >= comparableItemText.length) break;
  }

  return null;
}

function combineComparableTexts(left: string, right: string) {
  return normalizeComparableText([left, right].filter(Boolean).join(" "));
}

function splitItemByRuns(input: {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fallbackFontName?: string;
  runs: Array<{ text: string; fillColor?: string; fontName?: string }>;
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

  const weightedLengths = input.runs.map((run) => Math.max(1, normalizeComparableText(run.text).length));
  const totalWeight = weightedLengths.reduce((sum, value) => sum + value, 0);
  let currentX = input.x;
  let remainingWidth = input.width;

  return input.runs.map((run, index) => {
    const isLast = index === input.runs.length - 1;
    const width = isLast
      ? remainingWidth
      : Math.max(1, (input.width * (weightedLengths[index] || 1)) / totalWeight);

    const splitItem: PdfLayoutTextItem = {
      text: run.text,
      x: currentX,
      y: input.y,
      width,
      height: input.height,
      fontName: run.fontName || input.fallbackFontName,
      fillColor: run.fillColor,
    };

    currentX += width;
    remainingWidth -= width;
    return splitItem;
  });
}

function normalizeOperatorColor(args: unknown) {
  if (Array.isArray(args) && typeof args[0] === "string" && args[0]) {
    return args[0];
  }

  if (!Array.isArray(args)) return undefined;
  const numericArgs = args.filter((value): value is number => typeof value === "number");
  if (numericArgs.length === 1) {
    const channel = clampColorChannel(numericArgs[0]);
    return `#${channel}${channel}${channel}`;
  }
  if (numericArgs.length >= 3) {
    const [red, green, blue] = numericArgs;
    return `#${clampColorChannel(red)}${clampColorChannel(green)}${clampColorChannel(blue)}`;
  }

  return undefined;
}

function normalizeOperatorGray(args: unknown) {
  if (!Array.isArray(args) || typeof args[0] !== "number") return undefined;
  const channel = clampColorChannel(args[0]);
  return `#${channel}${channel}${channel}`;
}

function clampColorChannel(value: number) {
  const normalized = Math.max(0, Math.min(255, Math.round(value <= 1 ? value * 255 : value)));
  return normalized.toString(16).padStart(2, "0");
}
