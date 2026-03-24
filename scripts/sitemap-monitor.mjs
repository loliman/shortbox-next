import process from "node:process";
import * as cheerio from "cheerio";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_USER_AGENT = "shortbox-sitemap-monitor/1.0";

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || DEFAULT_BASE_URL);
  const sitemapUrl = process.env.SITEMAP_URL || `${baseUrl}/sitemap.xml`;
  const limit = parsePositiveInteger(process.env.SITEMAP_LIMIT);

  console.log(`Sitemap monitor against ${baseUrl}`);
  console.log(`Sitemap URL: ${sitemapUrl}`);
  if (limit) {
    console.log(`URL limit: ${limit}`);
  }

  const sitemapUrls = await readSitemapUrls(sitemapUrl);
  const urlsToCheck = limit ? sitemapUrls.slice(0, limit) : sitemapUrls;

  if (urlsToCheck.length === 0) {
    throw new Error("No URLs found in sitemap.");
  }

  let failedChecks = 0;

  for (const sitemapEntryUrl of urlsToCheck) {
    const result = await inspectSitemapEntry(baseUrl, sitemapEntryUrl);
    const failures = evaluateSitemapEntry(result);
    failedChecks += failures.length;
    printResult(result, failures);
  }

  if (failedChecks > 0) {
    console.error(`\nSitemap monitoring failed with ${failedChecks} failing check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nSitemap monitoring passed for ${urlsToCheck.length} URL(s).`);
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, "");
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function readSitemapUrls(sitemapUrl) {
  const response = await fetch(sitemapUrl, {
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const seen = new Set();
  const urls = [];
  const locPattern = /<loc>([^<]+)<\/loc>/g;

  for (const match of xml.matchAll(locPattern)) {
    const value = String(match[1] || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    urls.push(value);
  }

  return urls;
}

async function inspectSitemapEntry(baseUrl, sitemapEntryUrl) {
  const expectedPath = normalizeUrlPath(sitemapEntryUrl, baseUrl);
  const requestUrl = new URL(expectedPath, `${baseUrl}/`).toString();
  const response = await fetch(requestUrl, {
    redirect: "follow",
    headers: {
      "user-agent": DEFAULT_USER_AGENT,
      accept: "text/html,application/xhtml+xml",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  const canonicalHref = $("link[rel='canonical']").attr("href")?.trim() || null;

  return {
    sitemapEntryUrl,
    requestUrl,
    status: response.status,
    finalUrl: response.url,
    expectedPath,
    finalPath: normalizeUrlPath(response.url, baseUrl),
    canonicalHref,
    canonicalPath: canonicalHref ? normalizeUrlPath(canonicalHref, baseUrl) : null,
  };
}

function normalizeUrlPath(value, baseUrl) {
  const url = new URL(String(value), `${baseUrl}/`);
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  return `${pathname}${url.search}`;
}

function evaluateSitemapEntry(result) {
  const failures = [];

  if (result.status !== 200) {
    failures.push(`expected status 200 but received ${result.status}`);
  }

  if (result.finalPath !== result.expectedPath) {
    failures.push(`expected final path '${result.expectedPath}' but received '${result.finalPath}'`);
  }

  if (!result.canonicalPath) {
    failures.push("missing canonical link");
  } else if (result.canonicalPath !== result.expectedPath) {
    failures.push(
      `expected canonical path '${result.expectedPath}' but received '${result.canonicalPath}'`
    );
  }

  return failures;
}

function printResult(result, failures) {
  const statusLabel = failures.length === 0 ? "PASS" : "FAIL";
  console.log(`\n[${statusLabel}] ${result.expectedPath}`);
  console.log(`  sitemap: ${result.sitemapEntryUrl}`);
  console.log(`  request: ${result.requestUrl}`);
  console.log(`  status: ${result.status}`);
  console.log(`  final: ${result.finalUrl}`);
  console.log(`  canonical: ${result.canonicalHref || "<missing>"}`);

  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
}

try {
  await main();
} catch (error) {
  console.error("Sitemap monitoring crashed.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}



