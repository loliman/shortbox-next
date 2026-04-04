import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import net from "node:net";

const DEFAULT_PORT = 3110;
const DEFAULT_START_TIMEOUT_MS = 60_000;
const DEFAULT_ROUTES_FILE = path.resolve(process.cwd(), "scripts/audit-routes.json");

export function getAuditPort() {
  const rawPort = String(process.env.AUDIT_PORT || "").trim();
  if (!rawPort) return null;

  const parsed = Number.parseInt(rawPort, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export function getAuditBaseUrl() {
  const port = getAuditPort();
  return port ? `http://127.0.0.1:${port}` : null;
}

export async function loadAuditRoutes() {
  const routesFile = path.resolve(process.cwd(), process.env.AUDIT_ROUTES_FILE || DEFAULT_ROUTES_FILE);
  const fileContent = await fs.readFile(routesFile, "utf8");
  const parsed = JSON.parse(fileContent);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No audit routes found in ${routesFile}`);
  }

  const limit = Number.parseInt(String(process.env.AUDIT_LIMIT || "").trim(), 10);
  return Number.isFinite(limit) && limit > 0 ? parsed.slice(0, limit) : parsed;
}

export async function withStartedAuditServer(runAudit) {
  const port = (await resolveAuditPort()) || DEFAULT_PORT;
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = spawn("npm", ["run", "start"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
    },
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  server.stdout?.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  server.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForServerReady(baseUrl, server);
    return await runAudit({ baseUrl, port });
  } finally {
    await stopServer(server);
    if (stdout.trim()) {
      console.log(stdout.trim());
    }
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
  }
}

async function waitForServerReady(baseUrl, server) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < DEFAULT_START_TIMEOUT_MS) {
    if (server.exitCode !== null) {
      throw new Error(`Audit server exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl, {
        redirect: "manual",
        headers: {
          "user-agent": "shortbox-audit/1.0",
        },
      });

      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // keep polling until the server comes up
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for audit server at ${baseUrl}`);
}

async function stopServer(server) {
  if (server.exitCode !== null) return;

  terminateServer(server, "SIGTERM");
  const finished = await Promise.race([
    onceExit(server),
    sleep(5_000).then(() => false),
  ]);

  if (finished) return;

  terminateServer(server, "SIGKILL");
  await onceExit(server);
}

function terminateServer(server, signal) {
  if (server.exitCode !== null) return;

  if (process.platform !== "win32" && typeof server.pid === "number") {
    try {
      process.kill(-server.pid, signal);
      return;
    } catch {
      // fall back to killing just the parent process below
    }
  }

  server.kill(signal);
}

function onceExit(server) {
  return new Promise((resolve) => {
    server.once("exit", () => resolve(true));
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function resolveAuditPort() {
  const configuredPort = getAuditPort();
  if (configuredPort) return configuredPort;

  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : DEFAULT_PORT;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
  });
}
