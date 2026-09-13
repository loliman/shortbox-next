import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as cheerio from "cheerio";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_ROUTES_FILE = path.resolve(process.cwd(), "scripts/seo-smoke-routes.json");

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || DEFAULT_BASE_URL);
  const routesFile = path.resolve(process.cwd(), process.env.SEO_SMOKE_ROUTES_FILE || DEFAULT_ROUTES_FILE);
  const routeDefinitions = await loadRouteDefinitions(routesFile);

  let failedChecks = 0;
  console.log(`SEO smoke test against ${baseUrl}`);
  console.log(`Routes file: ${routesFile}`);

  for (const route of routeDefinitions) {
    const routeUrl = new URL(route.path, `${baseUrl}/`).toString();
    const result = await inspectRoute(routeUrl);
    const failures = evaluateRoute(route, baseUrl, result);
    failedChecks += failures.length;
    printRouteResult(route, result, failures);
  }

  if (failedChecks > 0) {
    console.error(`\nSEO smoke test failed with ${failedChecks} failing check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log("\nSEO smoke test passed.");
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, "");
}

async function loadRouteDefinitions(filePath) {
  const fileContent = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(fileContent);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No route definitions found in ${filePath}`);
  }
  return parsed;
}

async function inspectRoute(routeUrl) {
  const response = await fetch(routeUrl, {
    redirect: "follow",
    headers: {
      "user-agent": "shortbox-seo-smoke/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  return {
    status: response.status,
    finalUrl: response.url,
    title: $("title").first().text().trim() || null,
    canonical: $("link[rel='canonical']").attr("href")?.trim() || null,
    robots: $("meta[name='robots']").attr("content")?.trim() || null,
  };
}

function evaluateRoute(route, baseUrl, result) {
  const failures = [];

  if (result.status !== 200) {
    failures.push(`expected status 200 but received ${result.status}`);
  }

  if (route.expect.title && result.title !== route.expect.title) {
    failures.push(`expected title '${route.expect.title}' but received '${result.title || "<missing>"}'`);
  }

  const normalizedRobots = normalizeRobots(result.robots);
  const expectedRobots = normalizeRobots(route.expect.robots || "absent");
  if (normalizedRobots !== expectedRobots) {
    failures.push(`expected robots '${expectedRobots}' but received '${normalizedRobots}'`);
  }

  const normalizedCanonical = normalizeCanonical(result.canonical, baseUrl);
  const expectedCanonical = route.expect.canonicalPath === null
    ? null
    : normalizeCanonical(route.expect.canonicalPath || null, baseUrl);

  if (normalizedCanonical !== expectedCanonical) {
    failures.push(
      `expected canonical '${expectedCanonical ?? "<absent>"}' but received '${normalizedCanonical ?? "<absent>"}'`
    );
  }

  return failures;
}

function normalizeRobots(value) {
  if (!value) return "absent";
  const tokens = String(value)
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
  return tokens.join(",") || "absent";
}

function normalizeCanonical(value, baseUrl) {
  if (!value) return null;
  const url = new URL(String(value), `${baseUrl}/`);
  return `${url.pathname.replace(/\/$/, "") || "/"}${url.search}`;
}

function printRouteResult(route, result, failures) {
  const statusLabel = failures.length === 0 ? "PASS" : "FAIL";
  console.log(`\n[${statusLabel}] ${route.name} -> ${route.path}`);
  console.log(`  status: ${result.status}`);
  console.log(`  final: ${result.finalUrl}`);
  console.log(`  title: ${result.title || "<missing>"}`);
  console.log(`  canonical: ${result.canonical || "<missing>"}`);
  console.log(`  robots: ${result.robots || "<missing>"}`);

  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
}

try {
  await main();
} catch (error) {
  console.error("SEO smoke test crashed.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}

