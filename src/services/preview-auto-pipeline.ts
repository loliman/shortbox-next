import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchLatestPreviewInfo, type DetectedPreview } from "./preview-feed-watcher";
import { readStagedPreviewImport, saveStagedPreviewImport } from "../lib/server/preview-import-session";
import { extractTextFromPdfBuffer } from "../lib/server/pdf-text-extract";
import { extractPdfLayoutFromBuffer } from "../lib/server/pdf-layout-extract";
import { parsePreviewImportQueue } from "./preview-import-parser";
import { buildStagedPreviewImport } from "./preview-batch-import";
import {
  readDeSeriesByTitle,
  readUsSeriesByTitle,
  findDeSeriesForBatchImport,
  checkDeIssueExists,
} from "../lib/read/preview-import-read";
import type { StagedPreviewImport } from "../types/preview-import";

function tryStripPdfImages(buffer: Buffer): Buffer {
  const tempIn = join(tmpdir(), `pv_raw_${Date.now()}.pdf`);
  const tempOut = join(tmpdir(), `pv_stripped_${Date.now()}.pdf`);

  try {
    writeFileSync(tempIn, buffer);
    const pyScript = `
from pypdf import PdfReader, PdfWriter
reader = PdfReader("${tempIn}")
writer = PdfWriter()
for p in reader.pages:
    writer.add_page(p)
writer.remove_images()
with open("${tempOut}", "wb") as f:
    writer.write(f)
`;
    execSync(`python3 -c '${pyScript}'`, { timeout: 30000, stdio: "ignore" });
    const stripped = readFileSync(tempOut);
    return stripped;
  } catch {
    return buffer;
  } finally {
    try { unlinkSync(tempIn); } catch {}
    try { unlinkSync(tempOut); } catch {}
  }
}

export interface PipelineResult {
  action: "SKIPPED_ALREADY_EXISTS" | "STAGED_NEW_PREVIEW" | "NO_FEED_FOUND";
  preview?: DetectedPreview;
  staged?: StagedPreviewImport;
  message: string;
}

export async function runCheckPaniniPreviewPipeline(options?: { force?: boolean }): Promise<PipelineResult> {
  const latest = await fetchLatestPreviewInfo();
  if (!latest) {
    return {
      action: "NO_FEED_FOUND",
      message: "Keine Panini Vorschau im Feed gefunden.",
    };
  }

  const existingStaged = await readStagedPreviewImport();
  if (
    !options?.force &&
    existingStaged &&
    existingStaged.previewNumber >= latest.previewNumber &&
    existingStaged.status !== "DISCARDED"
  ) {
    return {
      action: "SKIPPED_ALREADY_EXISTS",
      preview: latest,
      staged: existingStaged,
      message: `Vorschau ${latest.previewNumber} ist bereits erfasst (Status: ${existingStaged.status}).`,
    };
  }

  // Download PDF
  const pdfResponse = await fetch(latest.pdfUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Shortbox Auto-Pipeline)",
    },
  });

  if (!pdfResponse.ok) {
    throw new Error(`Download von ${latest.pdfUrl} fehlgeschlagen mit Status ${pdfResponse.status}`);
  }

  const rawArrayBuffer = await pdfResponse.arrayBuffer();
  const rawBuffer = Buffer.from(rawArrayBuffer);
  const optimizedBuffer = tryStripPdfImages(rawBuffer);

  const arrayBufferToProcess = new Uint8Array(optimizedBuffer).buffer as ArrayBuffer;

  const [text, layout] = await Promise.all([
    extractTextFromPdfBuffer(arrayBufferToProcess.slice(0)),
    extractPdfLayoutFromBuffer(arrayBufferToProcess.slice(0)),
  ]);

  const queue = await parsePreviewImportQueue({
    fileName: `Panini-Vorschau-${latest.previewNumber}.pdf`,
    text,
    layout,
    seriesReader: {
      findDeSeriesByTitle: readDeSeriesByTitle,
      findUsSeriesByTitle: readUsSeriesByTitle,
    },
  });

  const staged = await buildStagedPreviewImport({
    queue,
    previewNumber: latest.previewNumber,
    sourceUrl: latest.pdfUrl,
    matcher: {
      findDeSeries: findDeSeriesForBatchImport,
      issueExists: checkDeIssueExists,
    },
  });

  await saveStagedPreviewImport(staged);

  return {
    action: "STAGED_NEW_PREVIEW",
    preview: latest,
    staged,
    message: `Panini Vorschau ${latest.previewNumber} erfolgreich vorbereitet (${staged.inScopeDrafts} Marvel-Ausgaben bereit zum Review).`,
  };
}
