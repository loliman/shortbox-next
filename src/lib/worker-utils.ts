import { makeWorkerUtils, type WorkerUtils } from "graphile-worker";
import { env } from "./env";

function resolveConnectionString() {
  if (env.DATABASE_URL) return env.DATABASE_URL;

  const host = env.DB_HOST;
  const port = env.DB_PORT;
  const database = env.DB_NAME;
  const user = encodeURIComponent(env.DB_USER);
  const password = encodeURIComponent(env.DB_PASSWORD);

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
