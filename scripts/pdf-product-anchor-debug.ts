import { readFileSync, writeFileSync } from "node:fs";
import { extractPdfLayoutFromBuffer } from "../src/lib/server/pdf-layout-extract";
import { analyzePreviewImportLayoutPages } from "../src/services/preview-import-layout";

async function main() {
  const pdfPath = process.argv[2];
  const outputPath = process.argv[3] ?? "/tmp/pdf-product-anchor-debug.txt";

  if (!pdfPath) {
    throw new Error("PDF-Pfad fehlt");
  }

  const fileBuffer = readFileSync(pdfPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  const layout = await extractPdfLayoutFromBuffer(arrayBuffer);
  const analyses = analyzePreviewImportLayoutPages(layout.pages);
  const lines: string[] = [];

  for (const analysis of analyses) {
    lines.push(`[Seite ${analysis.page.pageNumber}]`);
    for (const anchor of analysis.anchors) {
      lines.push(anchor.issueCode);
      lines.push(`  Metadaten: ${anchor.metadataBlock.text.replaceAll(/\s+/g, " ").trim()}`);
      lines.push(`  Inhalt: ${anchor.contentRow?.text ?? "-"}`);
      lines.push(
        `  Titel: ${anchor.titleRows.map((row) => row.text).join(" | ") || "-"}`
      );
      lines.push("");
    }
  }

  const output = lines.join("\n");
  writeFileSync(outputPath, output);
  console.log(output);
}

void main();
