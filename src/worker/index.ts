import { run, type Runner } from "graphile-worker";
import { getWorkerUtils, releaseWorkerUtils } from "../lib/worker-utils";
import { loadTaskList } from "./task-loader";

function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "shortbox";
  const user = encodeURIComponent(process.env.DB_USER || "shortbox");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "shortbox");

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

let runner: Runner | null = null;

export async function startWorker(): Promise<void> {
  if (runner) return;

  const workerUtils = await getWorkerUtils();
  await workerUtils.migrate();

  runner = await run({
    connectionString: resolveConnectionString(),
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
    taskList: loadTaskList(),
  });

  console.log("Graphile worker started");
}

export async function stopWorker(): Promise<void> {
  if (runner) {
    await runner.stop();
    runner = null;
  }

  await releaseWorkerUtils();
  console.log("Graphile worker stopped");
}

async function main() {
  await startWorker();

  const shutdown = async () => {
    try {
      await stopWorker();
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
}

if (require.main === module) {
  void main().catch(async (error) => {
    console.error(error);
    try {
      await stopWorker();
    } catch {}
    process.exit(1);
  });
}
