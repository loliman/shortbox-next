import "server-only";

import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import * as pdfjsWorker from "pdfjs-dist/legacy/build/pdf.worker.mjs";

Object.defineProperty(pdfjs.PDFWorker, "_setupFakeWorkerGlobal", {
  value: Promise.resolve(pdfjsWorker.WorkerMessageHandler),
  configurable: true,
});

export async function extractTextFromPdfBuffer(buffer: ArrayBuffer) {
  const data = new Uint8Array(buffer);
  const documentOptions = {
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  } as Parameters<typeof pdfjs.getDocument>[0];

  const document = await pdfjs.getDocument(documentOptions).promise;

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = toPageLines(content.items as Array<{ str?: string; transform?: number[] }>);
    if (lines.length > 0) pages.push(lines.join("\n"));
  }

  const text = pages.join("\n\n");
  if (text.replaceAll(/\s+/g, "").length < 50) {
    throw new Error("Die PDF enthält keinen ausreichend extrahierbaren Text");
  }

  return text;
}

function toPageLines(items: Array<{ str?: string; transform?: number[] }>) {
  const rows = new Map<string, Array<{ x: number; text: string }>>();

  for (const item of items) {
    const text = String(item.str || "").trim();
    if (!text) continue;
    const transform = Array.isArray(item.transform) ? item.transform : [];
    const x = typeof transform[4] === "number" ? transform[4] : 0;
    const y = typeof transform[5] === "number" ? transform[5] : 0;
    const key = String(Math.round(y * 10) / 10);
    const row = rows.get(key) || [];
    row.push({ x, text });
    rows.set(key, row);
  }

  return Array.from(rows.entries())
    .sort((left, right) => Number(right[0]) - Number(left[0]))
    .map(([, row]) =>
      row
        .sort((left, right) => left.x - right.x)
        .map((entry) => entry.text)
        .join(" ")
        .replaceAll(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}
