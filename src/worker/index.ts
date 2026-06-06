import { run, type Runner } from "graphile-worker";
import { env } from "../lib/env";
import { getWorkerUtils, releaseWorkerUtils } from "../lib/worker-utils";
import { loadTaskList } from "./task-loader";

function resolveConnectionString() {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const host = env.DB_HOST;
  const port = env.DB_PORT;
  const database = env.DB_NAME;
  const user = encodeURIComponent(env.DB_USER);
  const password = encodeURIComponent(env.DB_PASSWORD);

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

let runner: Runner | null = null;

export async function startWorker(): Promise<void> {
  if (runner) return;

  const workerUtils = await getWorkerUtils();
  await workerUtils.migrate();

  runner = await run({
    connectionString: resolveConnectionString(),
    concurrency: env.WORKER_CONCURRENCY,
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
