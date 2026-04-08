import "server-only";

import { extractPdfLayoutFromBuffer } from "./pdf-layout-extract";

export async function extractTextFromPdfBuffer(buffer: ArrayBuffer) {
  const layout = await extractPdfLayoutFromBuffer(buffer);
  const pages = layout.pages
    .map((page) => page.rows.map((row) => row.text).filter(Boolean).join("\n"))
    .filter(Boolean);

  const text = pages.join("\n\n");
  if (text.replaceAll(/\s+/g, "").length < 50) {
    throw new Error("Die PDF enthält keinen ausreichend extrahierbaren Text");
  }

  return text;
}
