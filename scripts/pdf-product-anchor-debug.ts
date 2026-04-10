import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function stubServerOnlyModule() {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  };
}

async function main() {
  stubServerOnlyModule();
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

  const [{ extractPdfLayoutFromBuffer }, { analyzePreviewImportLayoutPages }] = await Promise.all([
    import("../src/lib/server/pdf-layout-extract"),
    import("../src/services/preview-import-layout"),
  ]);

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
