import { makeWorkerUtils, type WorkerUtils } from "graphile-worker";

function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const database = process.env.DB_NAME || "shortbox_migration";
  const user = encodeURIComponent(process.env.DB_USER || "shortbox");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "shortbox");

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

let workerUtilsPromise: Promise<WorkerUtils> | null = null;

export async function getWorkerUtils(): Promise<WorkerUtils> {
  workerUtilsPromise ??= makeWorkerUtils({
    connectionString: resolveConnectionString(),
  });

  return workerUtilsPromise;
}

export async function releaseWorkerUtils(): Promise<void> {
  if (!workerUtilsPromise) return;
  const workerUtils = await workerUtilsPromise;
  await workerUtils.release();
  workerUtilsPromise = null;
}
