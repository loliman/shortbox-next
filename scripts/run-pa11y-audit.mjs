import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pa11y from "pa11y";
import { loadAuditRoutes, withStartedAuditServer } from "./audit-shared.mjs";

const DEFAULT_RUNNERS = ["axe"];
const DEFAULT_WAIT_MS = 500;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_LEVEL = "error";
const DEFAULT_THRESHOLD = 0;
const DEFAULT_PA11Y_CONFIG_FILE = path.resolve(process.cwd(), "scripts/pa11y-overrides.json");

async function main() {
  const routes = await loadAuditRoutes();
  const overrides = await loadPa11yOverrides();
  const level = String(process.env.PA11Y_LEVEL || DEFAULT_LEVEL);
  const threshold = parseInteger(process.env.PA11Y_THRESHOLD, DEFAULT_THRESHOLD);
  const wait = parseInteger(process.env.PA11Y_WAIT_MS, DEFAULT_WAIT_MS);
  const timeout = parseInteger(process.env.PA11Y_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);

  await withStartedAuditServer(async ({ baseUrl }) => {
    console.log(`Pa11y audit against ${baseUrl}`);
    console.log(`Routes: ${routes.map((route) => route.path).join(", ")}`);

    let failingRoutes = 0;

    for (const route of routes) {
      const url = new URL(route.path, `${baseUrl}/`).toString();
      const routeOverrides = resolveRouteOverrides(overrides, route);
      const result = await pa11y(url, {
        runners: DEFAULT_RUNNERS,
        level,
        threshold,
        wait,
        timeout,
        ...(routeOverrides.ignore.length > 0 ? { ignore: routeOverrides.ignore } : {}),
        ...(routeOverrides.hideElements.length > 0
          ? { hideElements: routeOverrides.hideElements.join(", ") }
          : {}),
      });

      const issues = Array.isArray(result.issues) ? result.issues : [];
      const summary = summarizeIssues(issues);
      const status = issues.length === 0 ? "PASS" : "FAIL";
      if (issues.length > 0) failingRoutes += 1;

      console.log(`\n[${status}] ${route.name} -> ${route.path}`);
      console.log(`  page: ${result.pageUrl}`);
      console.log(
        `  issues: ${issues.length} (errors: ${summary.error}, warnings: ${summary.warning}, notices: ${summary.notice})`
      );
      if (routeOverrides.ignore.length > 0) {
        console.log(`  ignore: ${routeOverrides.ignore.join(", ")}`);
      }
      if (routeOverrides.hideElements.length > 0) {
        console.log(`  hidden: ${routeOverrides.hideElements.join(", ")}`);
      }

      for (const issue of issues.slice(0, 10)) {
        console.log(`  - [${issue.type}] ${issue.message}`);
        if (issue.selector) {
          console.log(`    selector: ${issue.selector}`);
        }
        if (issue.context) {
          console.log(`    context: ${truncate(issue.context, 180)}`);
        }
      }
    }

    if (failingRoutes > 0) {
      throw new Error(`Pa11y audit failed for ${failingRoutes} route(s).`);
    }
  });
}

async function loadPa11yOverrides() {
  const configFile = path.resolve(
    process.cwd(),
    String(process.env.PA11Y_CONFIG_FILE || DEFAULT_PA11Y_CONFIG_FILE)
  );

  try {
    const fileContent = await fs.readFile(configFile, "utf8");
    return normalizePa11yOverrides(JSON.parse(fileContent));
  } catch (error) {
    if (isMissingFileError(error)) {
      return normalizePa11yOverrides({});
    }
    throw error;
  }
}

function normalizePa11yOverrides(input) {
  const parsed = isRecord(input) ? input : {};
  return {
    global: normalizeOverrideEntry(parsed.global),
    routes: Object.fromEntries(
      Object.entries(isRecord(parsed.routes) ? parsed.routes : {}).map(([key, value]) => [
        key,
        normalizeOverrideEntry(value),
      ])
    ),
  };
}

function resolveRouteOverrides(overrides, route) {
  const routeByName = overrides.routes[route.name];
  const routeByPath = overrides.routes[route.path];
  return mergeOverrideEntries(overrides.global, routeByName, routeByPath);
}

function normalizeOverrideEntry(input) {
  const parsed = isRecord(input) ? input : {};
  return {
    ignore: normalizeStringArray(parsed.ignore),
    hideElements: normalizeStringArray(parsed.hideElements),
  };
}

function mergeOverrideEntries(...entries) {
  return entries.reduce(
    (merged, entry) => ({
      ignore: dedupeStrings([...merged.ignore, ...normalizeStringArray(entry?.ignore)]),
      hideElements: dedupeStrings([
        ...merged.hideElements,
        ...normalizeStringArray(entry?.hideElements),
      ]),
    }),
    { ignore: [], hideElements: [] }
  );
}

function summarizeIssues(issues) {
  return issues.reduce(
    (counts, issue) => {
      const key = String(issue.type || "").toLowerCase();
      if (key === "error" || key === "warning" || key === "notice") {
        counts[key] += 1;
      }
      return counts;
    },
    { error: 0, warning: 0, notice: 0 }
  );
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return dedupeStrings(
    value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
  );
}

function dedupeStrings(values) {
  return [...new Set(values)];
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingFileError(error) {
  return Boolean(error) && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

function truncate(value, maxLength) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

try {
  await main();
} catch (error) {
  console.error("Pa11y audit failed.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
