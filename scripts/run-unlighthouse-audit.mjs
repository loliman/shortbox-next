import process from "node:process";
import { spawn } from "node:child_process";
import { loadAuditRoutes, withStartedAuditServer } from "./audit-shared.mjs";

const DEFAULT_BUDGET = 90;
const DEFAULT_DEVICE = "desktop";

async function main() {
  const routes = await loadAuditRoutes();
  const budget = parseInteger(process.env.UNLIGHTHOUSE_BUDGET, DEFAULT_BUDGET);
  const device = String(process.env.AUDIT_DEVICE || DEFAULT_DEVICE).toLowerCase() === "mobile"
    ? "mobile"
    : "desktop";

  await withStartedAuditServer(async ({ baseUrl }) => {
    console.log(`Unlighthouse audit against ${baseUrl}`);
    console.log(`Routes: ${routes.map((route) => route.path).join(", ")}`);
    console.log(`Device: ${device}`);
    console.log(`Budget: ${budget}`);

    const args = [
      "--site",
      baseUrl,
      "--urls",
      routes.map((route) => route.path).join(","),
      "--budget",
      String(budget),
      "--reporter",
      "jsonExpanded",
      "--no-cache",
      device === "mobile" ? "--mobile" : "--desktop",
    ];

    await spawnAndWait("./node_modules/.bin/unlighthouse-ci", args);
  });
}

function spawnAndWait(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Unlighthouse exited with code ${code ?? "<unknown>"}`));
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

try {
  await main();
} catch (error) {
  console.error("Unlighthouse audit failed.");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
}
