import "server-only";

import fs from "fs";
import path from "path";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";

// ── Types ────────────────────────────────────────────────────────────────────

export interface NormalizedCurationStory {
  sequenceNumber: number;
  shortboxStoryId?: number;
  shortboxTitle?: string;
  shortboxTranslator?: string;
  shortboxParentUs?: string;
  gcdTitle?: string;
  gcdScript?: string;
  gcdPencils?: string;
  gcdInks?: string;
  gcdFeature?: string;
  uhbmccTitle?: string;
  uhbmccTranslators?: string[];
  uhbmccOriginalIssue?: string;
  titleStatus: "CONSENSUS" | "CONFLICT" | "SHORTBOX_ONLY" | "EXTERNAL_ONLY";
  translatorStatus: "CONSENSUS" | "CONFLICT" | "MISSING_IN_SHORTBOX" | "NOT_APPLICABLE";
  notes: string[];
}

export interface AutonomousDecision {
  field: string;
  storyNumber?: number;
  action: string;
  appliedValue: string;
  rule: string;
  sources: string[];
}

export interface NonDecision {
  field: string;
  storyNumber?: number;
  reason: string;
  sourceValues: Record<string, string>;
  promptForUser: string;
}

export interface CurationDossierResult {
  issue: {
    id: number;
    series: string;
    number: string;
    publisher: string;
    isUs: boolean;
    variants: Array<{
      id: number;
      format: string;
      variantLabel: string | null;
      gcdId: number | null;
      comicGuideId: number | null;
      isbn: string | null;
      pages: number | null;
      price: string | null;
      collected: boolean | null;
    }>;
  };
  sourcesFound: {
    shortbox: boolean;
    gcd: boolean;
    uhbmcc: boolean;
  };
  gcdSourceInfo?: {
    gcdIssueId: number;
    seriesName: string;
    issueNumber: string;
    storiesCount: number;
  };
  uhbmccSourceInfo?: {
    file: string;
    seriesTitle: string;
    issueNumber: string;
    storiesCount: number;
  };
  verdict: "AUTONOMOUS" | "NON_DECISION";
  autonomousDecisions: AutonomousDecision[];
  nonDecisions: NonDecision[];
  nextStep: string;
  storiesComparison: NormalizedCurationStory[];
  recommendedActions: string[];
}

// ── String Normalization (AGENTS.md rule 3) ──────────────────────────────────

export function normalizeCurationString(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Strips editorial noise, surrounding quotes, and obvious suffixes before comparison.
 */
export function sanitizeComparisonTitle(title: string | null | undefined): string {
  if (!title) return "";
  let clean = title.trim();
  // Strip surrounding quotes
  if (
    (clean.startsWith('"') && clean.endsWith('"') && clean.length > 1) ||
    (clean.startsWith("'") && clean.endsWith("'") && clean.length > 1) ||
    (clean.startsWith("„") && (clean.endsWith("“") || clean.endsWith('"')) && clean.length > 1)
  ) {
    clean = clean.slice(1, -1).trim();
  }
  return normalizeCurationString(clean);
}

// ── GCD Local Lookup ─────────────────────────────────────────────────────────

interface GcdStoryRaw {
  id: number;
  issueId: number;
  title: string;
  feature?: string;
  sequenceNumber: number;
  pageCount?: number;
  script?: string;
  pencils?: string;
  inks?: string;
  typeId?: number;
}

interface GcdIssueRaw {
  id: number;
  seriesId: number;
  number: string;
  title?: string;
  publicationDate?: string;
  price?: string;
  pageCount?: number;
  isbn?: string;
  stories: GcdStoryRaw[];
}

interface GcdSeriesRaw {
  id: number;
  name: string;
  issues: GcdIssueRaw[];
}

interface GcdPublisherRaw {
  publisher: { id: number; name: string };
  series: GcdSeriesRaw[];
}

// Cache of loaded publisher files
const gcdPublisherCache = new Map<string, GcdPublisherRaw>();

export function findGcdIssueLocally(params: {
  gcdId?: number | null;
  publisherName?: string;
  seriesTitle?: string;
  issueNumber?: string;
}): { issue: GcdIssueRaw; seriesName: string } | null {
  const gcdDir = path.resolve(process.cwd(), "scripts/migrations/data/gcd/publishers");
  if (!fs.existsSync(gcdDir)) return null;

  // 1. If gcdId is given, search in the most likely publisher files first, or scan
  const targetGcdId = params.gcdId ? Number(params.gcdId) : null;

  // Gather publisher files to search
  let filesToSearch: string[] = [];
  const allFiles = fs.readdirSync(gcdDir).filter((f) => f.endsWith(".json"));

  if (params.publisherName) {
    const pubNorm = normalizeCurationString(params.publisherName);
    const matchedFiles = allFiles.filter((f) => {
      const fNorm = f.toLowerCase();
      if (pubNorm.includes("panini") && fNorm.includes("panini")) return true;
      if (pubNorm.includes("ehapa") && fNorm.includes("ehapa")) return true;
      if (pubNorm.includes("condor") && fNorm.includes("condor")) return true;
      if (pubNorm.includes("williams") && fNorm.includes("williams")) return true;
      if (pubNorm.includes("bastei") && fNorm.includes("bastei")) return true;
      if (pubNorm.includes("bsv") && fNorm.includes("bsv")) return true;
      if (pubNorm.includes("carlsen") && fNorm.includes("carlsen")) return true;
      if (pubNorm.includes("feest") && fNorm.includes("feest")) return true;
      if (pubNorm.includes("splitter") && fNorm.includes("splitter")) return true;
      if (pubNorm.includes("dino") && fNorm.includes("dino")) return true;
      if (pubNorm.includes("hethke") && fNorm.includes("hethke")) return true;
      return false;
    });
    filesToSearch = matchedFiles.length > 0 ? matchedFiles : allFiles;
  } else {
    filesToSearch = allFiles;
  }

  const seriesNorm = params.seriesTitle ? normalizeCurationString(params.seriesTitle) : null;
  const numNorm = params.issueNumber ? params.issueNumber.trim() : null;

  for (const filename of filesToSearch) {
    let pubData = gcdPublisherCache.get(filename);
    if (!pubData) {
      try {
        const raw = fs.readFileSync(path.join(gcdDir, filename), "utf-8");
        pubData = JSON.parse(raw) as GcdPublisherRaw;
        gcdPublisherCache.set(filename, pubData);
      } catch {
        continue;
      }
    }

    if (!pubData.series) continue;

    for (const ser of pubData.series) {
      if (seriesNorm) {
        const serNameNorm = normalizeCurationString(ser.name);
        const matchesSeries =
          serNameNorm === seriesNorm ||
          serNameNorm.includes(seriesNorm) ||
          seriesNorm.includes(serNameNorm);
        if (!targetGcdId && !matchesSeries) continue;
      }

      for (const iss of ser.issues) {
        if (targetGcdId && Number(iss.id) === targetGcdId) {
          return { issue: iss, seriesName: ser.name };
        }
        if (!targetGcdId && numNorm && iss.number.trim() === numNorm) {
          return { issue: iss, seriesName: ser.name };
        }
      }
    }
  }

  return null;
}

// ── UHBMCC Local Lookup ──────────────────────────────────────────────────────

interface UhbmccIssueMatch {
  file: string;
  seriesTitle: string;
  issueNumber: string;
  stories: Array<{
    title: string;
    rawTitle: string;
    translators: string[];
    originalIssue: string;
    originalTitle: string;
  }>;
}

export function findUhbmccIssueLocally(params: {
  seriesTitle: string;
  issueNumber: string;
  publisherName?: string;
}): UhbmccIssueMatch | null {
  const uhbmccDir = path.resolve(process.cwd(), "docs/sources/uhbmcc");
  if (!fs.existsSync(uhbmccDir)) return null;

  const targetSeriesNorm = normalizeCurationString(params.seriesTitle);
  const targetNum = params.issueNumber.trim();

  // Search candidate HTML files
  const files = fs.readdirSync(uhbmccDir).filter((f) => f.toUpperCase().endsWith(".HTM") || f.toUpperCase().endsWith(".HTML"));

  for (const file of files) {
    if (file.startsWith("VERLAG") || file.startsWith("DATA") || file.startsWith("INDEX")) continue;

    const fullPath = path.join(uhbmccDir, file);
    try {
      const buffer = fs.readFileSync(fullPath);
      // UHBMCC files are usually windows-1252 or utf-8
      const html = iconv.decode(buffer, "win1252");

      if (!html.toLowerCase().includes(targetSeriesNorm.split(" ")[0])) {
        continue;
      }

      const $ = cheerio.load(html);

      // Check headings (h1, h2, h3, or bold headers)
      let foundMatchingIssue = false;
      const matchedStories: UhbmccIssueMatch["stories"] = [];

      $("tr").each((_, row) => {
        const text = $(row).text();
        // Look for issue number in first td or header
        const tds = $(row).find("td");
        if (tds.length >= 2) {
          const firstTd = $(tds[0]).text().trim();
          if (firstTd === targetNum || firstTd === `#${targetNum}` || firstTd.startsWith(`${targetNum} `)) {
            foundMatchingIssue = true;
            const storyTitle = $(tds[1]).text().trim();
            const rawText = text;

            // Extract translators if Ü: is present
            const translators: string[] = [];
            const uMatch = rawText.match(/Ü:\s*([^–\-\n]+)/);
            if (uMatch) {
              translators.push(
                ...uMatch[1]
                  .split(/[,/&]/)
                  .map((t) => t.trim())
                  .filter(Boolean)
              );
            }

            // Extract US reference if US: or US-Heft is present
            let originalIssue = "";
            const usMatch = rawText.match(/US:\s*([^–\-\n\(\)]+)/i);
            if (usMatch) {
              originalIssue = usMatch[1].trim();
            }

            matchedStories.push({
              title: storyTitle.replace(/^["„]/, "").replace(/["“]$/, "").trim(),
              rawTitle: storyTitle,
              translators,
              originalIssue,
              originalTitle: "",
            });
          }
        }
      });

      if (foundMatchingIssue && matchedStories.length > 0) {
        return {
          file,
          seriesTitle: params.seriesTitle,
          issueNumber: targetNum,
          stories: matchedStories,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}
