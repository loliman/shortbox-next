import * as cheerio from "cheerio";
import { request } from "undici";

/* =====================
 * Public types
 * ===================== */

export interface PaniniScrapedIssue {
  title: string;
  seriesTitle: string;
  isbn: string;
  pages: number;
  releasedate: string; // "YYYY-MM-DD"
  containsRaw: string;
  price?: string;
  writer?: string;
  penciler?: string;
}

export interface PaniniScrapeResult {
  data?: PaniniScrapedIssue;
  error?: string;
}

/* ==================
 * Internal constants
 * ================== */

const USER_AGENT = "shortbox-crawler/1.1 (+https://shortbox.de)";
const HTTP_MAX_ATTEMPTS = 2;
const HTTP_RETRY_DELAY_MS = 2500;

const RETRYABLE_HTTP_STATUS_CODES = new Set([429, 500, 502, 503, 504, 520, 522, 524]);
const RETRYABLE_HTTP_ERROR_CODES = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ETIMEDOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET",
]);

export const PANINI_DE_URL_PATTERN = /^https?:\/\/(www\.)?panini\.de\/shp_deu_de\//i;

/* ==================
 * Public API
 * ================== */

export async function scrapePaniniIssue(url: string): Promise<PaniniScrapeResult> {
  if (!PANINI_DE_URL_PATTERN.test(url)) {
    return { error: "Ungültige URL. Nur panini.de/shp_deu_de/-Links werden unterstützt." };
  }

  let text: string;
  let statusCode: number;

  try {
    const result = await requestTextWithRetry(url);
    text = result.text;
    statusCode = result.statusCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return { error: `Seite konnte nicht geladen werden: ${message}` };
  }

  if (statusCode === 404) {
    return { error: "Produkt nicht gefunden (404)." };
  }

  if (statusCode !== 200) {
    return { error: `Unerwarteter HTTP-Status: ${statusCode}` };
  }

  return parseProductPage(text, url);
}

/* ==================
 * HTML Parsing
 * ================== */

function parseProductPage(html: string, url: string): PaniniScrapeResult {
  const $ = cheerio.load(html);

  const title = extractTitle($);
  if (!title) {
    return { error: `Produkttitel konnte nicht gelesen werden. (URL: ${url})` };
  }

  const details = extractDetails($);
  const releasedate = parseReleaseDate(details.erscheinungsdatum ?? "");

  const data: PaniniScrapedIssue = {
    title,
    seriesTitle: title,
    isbn: normalizeIsbn(details.isbn ?? ""),
    pages: parseIntSafe(details.seiten ?? ""),
    releasedate,
    containsRaw: details.enthaelt ?? "",
    price: details.preis,
    writer: details.autor,
    penciler: details.zeichner,
  };

  return { data };
}

function extractTitle($: ReturnType<typeof cheerio.load>): string {
  // Try common product title selectors for Panini shop (Magento-based)
  const candidates = [
    $("h1.page-title span").first().text(),
    $("h1.page-title").first().text(),
    $("h1.product-name").first().text(),
    $('[data-ui-id="page-title-wrapper"]').first().text(),
    $("h1").first().text(),
  ];

  for (const candidate of candidates) {
    const normalized = ws(candidate);
    if (normalized.length > 0) return normalized;
  }

  return "";
}

interface ProductDetails {
  isbn?: string;
  seiten?: string;
  erscheinungsdatum?: string;
  enthaelt?: string;
  preis?: string;
  autor?: string;
  zeichner?: string;
}

function extractDetails($: ReturnType<typeof cheerio.load>): ProductDetails {
  const details: ProductDetails = {};

  // Strategy 1: table rows with labeled entries (Magento .additional-attributes)
  $("table.additional-attributes tr, .product-attributes tr, .product-info-detail tr").each(
    (_, row) => {
      const label = ws($(row).find("th, td:first-child, .label").text()).toLowerCase();
      const value = ws($(row).find("td:last-child, .data").text());
      mapDetailLabel(details, label, value);
    }
  );

  // Strategy 2: dt/dd pairs
  if (!hasAnyDetail(details)) {
    $("dl dt, .product-attribute-label").each((_, el) => {
      const label = ws($(el).text()).toLowerCase();
      const value = ws($(el).next("dd, .product-attribute-value").text());
      mapDetailLabel(details, label, value);
    });
  }

  // Strategy 3: Generic labeled rows
  if (!hasAnyDetail(details)) {
    $(".product-info-attributes .item, .product-detail .row, .product-info-detailed .item").each(
      (_, el) => {
        const label = ws($(el).find(".label, .title, strong, th").first().text()).toLowerCase();
        const value = ws($(el).find(".data, .value, td").text());
        mapDetailLabel(details, label, value);
      }
    );
  }

  // Strategy 4: JSON-LD structured data
  extractFromJsonLd($, details);

  // Strategy 5: Last resort – scan body text for ISBN
  if (!details.isbn) {
    const bodyText = $("body").text();
    const isbnMatch = /ISBN[:\s-]*([\d-]{10,17})/i.exec(bodyText);
    if (isbnMatch) {
      details.isbn = isbnMatch[1];
    }
  }

  return details;
}

function hasAnyDetail(details: ProductDetails): boolean {
  return Boolean(details.isbn || details.seiten || details.erscheinungsdatum);
}

function mapDetailLabel(details: ProductDetails, label: string, value: string) {
  if (!value) return;

  if (label.includes("isbn")) {
    details.isbn ??= value;
  } else if (
    label.includes("seiten") ||
    label.includes("seitenzahl") ||
    label.includes("umfang")
  ) {
    details.seiten ??= value;
  } else if (
    label.includes("erscheinungsdatum") ||
    label.includes("erscheint") ||
    label.includes("datum") ||
    label.includes("release")
  ) {
    details.erscheinungsdatum ??= value;
  } else if (
    label.includes("enthält") ||
    label.includes("enthalt") ||
    label.includes("inhalt") ||
    label.includes("beinhaltet")
  ) {
    details.enthaelt ??= value;
  } else if (label.includes("preis") || label.includes("price")) {
    details.preis ??= value;
  } else if (label.includes("autor") || label.includes("text") || label.includes("writer")) {
    details.autor ??= value;
  } else if (
    label.includes("zeichner") ||
    label.includes("artist") ||
    label.includes("illustrat")
  ) {
    details.zeichner ??= value;
  }
}

function extractFromJsonLd($: ReturnType<typeof cheerio.load>, details: ProductDetails) {
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() ?? "{}") as Record<string, unknown>;
      if (json["@type"] === "Product" || json["@type"] === "Book") {
        const isbn = readJsonString(json, "isbn");
        const numberOfPages = readJsonString(json, "numberOfPages");
        const datePublished = readJsonString(json, "datePublished");
        const price = extractJsonLdPrice(json);

        if (isbn) details.isbn ??= isbn;
        if (numberOfPages) details.seiten ??= numberOfPages;
        if (datePublished) details.erscheinungsdatum ??= datePublished;
        if (price) details.preis ??= price;
      }
    } catch {
      // Ignore JSON parse errors
    }
  });
}

function readJsonString(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function extractJsonLdPrice(obj: Record<string, unknown>): string {
  const offers = obj["offers"] as Record<string, unknown> | undefined;
  if (!offers) return "";
  const price = readJsonString(offers, "price");
  const currency = readJsonString(offers, "priceCurrency");
  if (price && currency) return `${price} ${currency}`;
  return price;
}

/* ==================
 * Value normalization
 * ================== */

function parseReleaseDate(raw: string): string {
  if (!raw) return "";

  // ISO format: "2026-06-30"
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // German long format: "30. Juni 2026"
  const germanLong = /(\d{1,2})\.\s*([A-Za-z\u00e4\u00f6\u00fc\u00c4\u00d6\u00dc]+)\s+(\d{4})/.exec(raw);
  if (germanLong) {
    const day = germanLong[1].padStart(2, "0");
    const month = parseGermanMonth(germanLong[2]);
    const year = germanLong[3];
    if (month) return `${year}-${month}-${day}`;
  }

  // German short format: "30.06.2026"
  const germanShort = /(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(raw);
  if (germanShort) {
    const day = germanShort[1].padStart(2, "0");
    const month = germanShort[2].padStart(2, "0");
    const year = germanShort[3];
    return `${year}-${month}-${day}`;
  }

  // Native Date fallback
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return "";
}

function parseGermanMonth(name: string): string | null {
  const months: Record<string, string> = {
    januar: "01",
    februar: "02",
    "m\u00e4rz": "03",
    april: "04",
    mai: "05",
    juni: "06",
    juli: "07",
    august: "08",
    september: "09",
    oktober: "10",
    november: "11",
    dezember: "12",
  };
  return months[name.toLowerCase()] ?? null;
}

function normalizeIsbn(raw: string): string {
  return raw.replaceAll(/[^0-9X-]/gi, "").trim();
}

function parseIntSafe(raw: string): number {
  const match = /\d+/.exec(raw);
  if (!match) return 0;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ws(s: string) {
  return s.replaceAll(/\s+/g, " ").trim();
}

/* ==================
 * HTTP
 * ================== */

async function requestTextWithRetry(url: string): Promise<{ statusCode: number; text: string }> {
  let lastError: unknown;

  for (let attempt = 0; attempt < HTTP_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await request(url, {
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "de-DE,de;q=0.9",
        },
      });
      const text = await res.body.text();

      if (
        attempt + 1 < HTTP_MAX_ATTEMPTS &&
        RETRYABLE_HTTP_STATUS_CODES.has(res.statusCode)
      ) {
        await wait(HTTP_RETRY_DELAY_MS);
        continue;
      }

      return { statusCode: res.statusCode, text };
    } catch (error) {
      lastError = error;
      if (
        attempt + 1 < HTTP_MAX_ATTEMPTS &&
        RETRYABLE_HTTP_ERROR_CODES.has(getErrorCode(error))
      ) {
        await wait(HTTP_RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Request failed for ${url}`);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}
