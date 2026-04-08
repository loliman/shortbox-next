import { readFileSync } from "node:fs";
import { extractTextFromPdfBuffer } from "../src/lib/server/pdf-text-extract";
import { extractPdfLayoutFromBuffer } from "../src/lib/server/pdf-layout-extract";
import { parsePreviewImportQueue } from "../src/services/preview-import-parser";

async function main() {
  const pdfPath = process.argv[2];
  const issueCode = process.argv[3];

  if (!pdfPath || !issueCode) {
    throw new Error("Usage: preview-import-debug <pdf-path> <issue-code>");
  }

  const fileBuffer = readFileSync(pdfPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  const [text, layout] = await Promise.all([
    extractTextFromPdfBuffer(arrayBuffer.slice(0)),
    extractPdfLayoutFromBuffer(arrayBuffer.slice(0)),
  ]);
  const queue = await parsePreviewImportQueue({
    fileName: pdfPath.split("/").at(-1) ?? "preview.pdf",
    text,
    layout,
    seriesReader: {
      findDeSeriesByTitle: async () => [],
    },
  });

  const draft = queue.drafts.find((entry) => entry.issueCode === issueCode);
  console.log(JSON.stringify(draft ?? null, null, 2));
}

void main();
