import { readFileSync, writeFileSync } from "node:fs";
import { extractPdfLayoutFromBuffer } from "../src/lib/server/pdf-layout-extract";

async function main() {
  const pdfPath = process.argv[2];
  const pageArg = process.argv[3];
  const outputPath = process.argv[4] ?? "/tmp/pdf-color-debug.txt";

  if (!pdfPath) {
    throw new Error("PDF-Pfad fehlt");
  }

  const selectedPages = parsePageSelection(pageArg);
  const fileBuffer = readFileSync(pdfPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  const layout = await extractPdfLayoutFromBuffer(arrayBuffer);
  const pages = selectedPages.length > 0
    ? layout.pages.filter((page) => selectedPages.includes(page.pageNumber))
    : layout.pages;

  const lines: string[] = [];

  for (const page of pages) {
    lines.push(`[Seite ${page.pageNumber}]`);
    for (const row of page.rows) {
      lines.push(
        `${round(row.y).padStart(6, " ")} | ${row.text}`
      );
      for (const item of row.items) {
        lines.push(
          `         - ${item.text} | color=${item.fillColor ?? "-"} | font=${item.fontName ?? "-"} | x=${round(item.x)}`
        );
      }
    }
    lines.push("");
  }

  const output = lines.join("\n");
  writeFileSync(outputPath, output);
  console.log(output);
}

function parsePageSelection(pageArg: string | undefined) {
  if (!pageArg) return [];
  return pageArg
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter(Number.isFinite);
}

function round(value: number) {
  return (Math.round(value * 10) / 10).toString();
}

void main();
