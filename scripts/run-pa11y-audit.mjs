import process from "node:process";
import pa11y from "pa11y";
import { getAuditBaseUrl, loadAuditRoutes, withStartedAuditServer } from "./audit-shared.mjs";

const DEFAULT_RUNNERS = ["axe"];
const DEFAULT_WAIT_MS = 500;
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_LEVEL = "error";
const DEFAULT_THRESHOLD = 0;

async function main() {
  const routes = await loadAuditRoutes();
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
      const result = await pa11y(url, {
        runners: DEFAULT_RUNNERS,
        level,
        threshold,
        wait,
        timeout,
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
