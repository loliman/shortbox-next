import { spawn } from "node:child_process";
import process from "node:process";

const port = process.env.PORT || "3000";
const host = process.env.HOST || "0.0.0.0";

const processes = [
  {
    name: "web",
    child: spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-H", host, "-p", port],
      {
        stdio: "inherit",
        env: process.env,
      },
    ),
  },
  {
    name: "worker",
    child: spawn(process.execPath, ["dist/worker/worker/index.js"], {
      stdio: "inherit",
      env: process.env,
    }),
  },
];

let shuttingDown = false;

function stopAll(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;

  for (const { child } of processes) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const { name, child } of processes) {
  child.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.error(
        `${name} exited unexpectedly (${signal ? `signal ${signal}` : `code ${code ?? 0}`})`,
      );
      stopAll();
      process.exitCode = code ?? 1;
    }
  });

  child.on("error", (error) => {
    console.error(`${name} failed to start`, error);
    stopAll();
    process.exitCode = 1;
  });
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));

Promise.all(
  processes.map(
    ({ child }) =>
      new Promise((resolve) => {
        child.on("close", resolve);
      }),
  ),
).then(() => {
  process.exit(process.exitCode ?? 0);
});
