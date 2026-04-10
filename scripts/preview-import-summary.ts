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

function formatValue(value: unknown) {
  return value == null || value === "" ? "-" : String(value);
}

function storyTitle(story: Record<string, unknown>) {
  if (typeof story.story === "string" && typeof story.number === "string" && story.number) {
    return `${story.story} ${story.number}`;
  }

  const parent = story.parent;
  if (parent && typeof parent === "object") {
    const parentIssue = (parent as { issue?: unknown }).issue;
    if (parentIssue && typeof parentIssue === "object") {
      const series = (parentIssue as { series?: unknown }).series;
      const number = (parentIssue as { number?: unknown }).number;
      const seriesTitle =
        series && typeof series === "object"
          ? (series as { title?: unknown }).title
          : undefined;

      if (typeof seriesTitle === "string" && typeof number === "string" && number) {
        return `${seriesTitle} ${number}`;
      }
    }
  }

  if (typeof story.title === "string") {
    return story.title;
  }

  return "";
}

async function main() {
  stubServerOnlyModule();
  const pdfPath = process.argv[2];
  const outputPath = process.argv[3] ?? "/tmp/panini-vorschau-121.summary.txt";

  if (!pdfPath) {
    throw new Error("PDF-Pfad fehlt");
  }

  const fileBuffer = readFileSync(pdfPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  const [{ extractTextFromPdfBuffer }, { extractPdfLayoutFromBuffer }, { parsePreviewImportQueue }] =
    await Promise.all([
      import("../src/lib/server/pdf-text-extract"),
      import("../src/lib/server/pdf-layout-extract"),
      import("../src/services/preview-import-parser"),
    ]);

  const [text, layout] = await Promise.all([
    extractTextFromPdfBuffer(arrayBuffer.slice(0)),
    extractPdfLayoutFromBuffer(arrayBuffer.slice(0)),
  ]);
  const relevantText = extractRelevantPreviewText(text);
  const queue = await parsePreviewImportQueue({
    fileName: pdfPath.split("/").at(-1) ?? "preview.pdf",
    text,
    layout,
    seriesReader: {
      findDeSeriesByTitle: async () => [],
    },
  });
  const orderedDrafts = [...queue.drafts].sort((left, right) => {
    const leftGroupKey = left.variantOfDraftId
      ? queue.drafts.find((draft) => draft.id === left.variantOfDraftId)?.issueCode ?? left.issueCode
      : left.issueCode;
    const rightGroupKey = right.variantOfDraftId
      ? queue.drafts.find((draft) => draft.id === right.variantOfDraftId)?.issueCode ?? right.issueCode
      : right.issueCode;
    const leftIndex = readIssueCodePosition(relevantText, leftGroupKey);
    const rightIndex = readIssueCodePosition(relevantText, rightGroupKey);

    if (leftIndex !== rightIndex) return leftIndex - rightIndex;
    if (left.variantOfDraftId && !right.variantOfDraftId) return 1;
    if (!left.variantOfDraftId && right.variantOfDraftId) return -1;

    const leftVariantRank = readVariantRank(left.values.variant);
    const rightVariantRank = readVariantRank(right.values.variant);
    return leftVariantRank - rightVariantRank;
  });

  const warningCounts = new Map<string, number>();
  for (const draft of orderedDrafts) {
    for (const warning of draft.warnings ?? []) {
      warningCounts.set(warning, (warningCounts.get(warning) ?? 0) + 1);
    }
  }

  const topWarnings = [...warningCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10);

  const lines: string[] = [];
  lines.push("Parse-Uebersicht");
  lines.push(`Gesamt: ${orderedDrafts.length}`);
  lines.push(`Variants: ${orderedDrafts.filter((draft) => Boolean(draft.values.variant)).length}`);
  lines.push(
    `Mit Warnings: ${orderedDrafts.filter((draft) => (draft.warnings ?? []).length > 0).length}`
  );
  lines.push("");
  lines.push("Top-Warnings");

  if (topWarnings.length === 0) {
    lines.push("- keine");
  } else {
    for (const [warning, count] of topWarnings) {
      lines.push(`- ${count}x ${warning}`);
    }
  }

  lines.push("");
  lines.push("Drafts");

  for (const draft of orderedDrafts) {
    const stories = (draft.values.stories ?? [])
      .map((story) => storyTitle(story as Record<string, unknown>))
      .filter(Boolean);

    lines.push(formatValue(draft.issueCode));
    lines.push(`  Serie: ${formatValue(draft.values.series?.title)}`);

    const title = draft.values.title;
    if (title) {
      lines.push(`  Titel: ${formatValue(title)}`);
    }

    lines.push(`  Nummer: ${formatValue(draft.values.number)}`);

    const variant = draft.values.variant;
    if (variant) {
      lines.push(`  Variant: ${formatValue(variant)}`);
    }

    lines.push(`  Format: ${formatValue(draft.values.format)}`);
    lines.push(`  Seiten: ${formatValue(draft.values.pages)}`);
    lines.push(`  Preis: ${formatValue(draft.values.price)}`);
    lines.push(`  Datum: ${formatValue(draft.values.releasedate)}`);

    const limitation = draft.values.limitation;
    if (limitation) {
      lines.push(`  Limitierung: ${formatValue(limitation)}`);
    }

    lines.push(`  Stories: ${stories.length > 0 ? stories.join(", ") : "-"}`);

    if ((draft.warnings ?? []).length > 0) {
      lines.push(`  Warnings: ${draft.warnings.join(" | ")}`);
    }

    lines.push("");
  }

  const output = lines.join("\n");
  writeFileSync(outputPath, output);
  console.log(output);
}

function readIssueCodePosition(text: string, issueCode: string | undefined) {
  if (!issueCode) return Number.MAX_SAFE_INTEGER;
  const index = text.indexOf(issueCode);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function readVariantRank(variant: string | undefined) {
  if (!variant) return 0;
  const normalized = variant.trim().toUpperCase();
  if (!normalized) return 0;
  return normalized.charCodeAt(0) - 64;
}

function extractRelevantPreviewText(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((page) => page.trim())
    .filter(Boolean)
    .filter((page) =>
      page
        .split(/\r?\n/)
        .map((line) => line.replaceAll(/\s+/g, " ").trim())
        .some((line) => containsNeuheitenHeading(line))
    )
    .join("\n\n");
}

function containsNeuheitenHeading(line: string) {
  return /\bN E U H E I T E N\b/i.test(line.replaceAll(/\s+/g, " ").trim());
}

void main();
