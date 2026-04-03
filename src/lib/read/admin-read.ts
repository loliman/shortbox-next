import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { ADMIN_TASK_DEFINITIONS, type AdminTaskName } from "../../worker/task-registry";

type AdminTaskRun = {
  id: string;
  taskKey: string;
  taskName: string;
  startedAt: string;
  finishedAt: string | null;
  dryRun: boolean;
  status: "SUCCESS" | "FAILED";
  summary: string;
  details: string | null;
};

type TaskResultRow = {
  id: number;
  job_id: string;
  task_identifier: string;
  result_json: string;
  created_at: Date;
};

type JobViewRow = {
  id: string | number;
  task_identifier: string;
  run_at: Date | null;
  created_at: Date;
  locked_at: Date | null;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
};

export async function readAdminTasks(limitRuns = 10) {
  try {
    const normalizedLimitRuns = normalizeLimitRuns(limitRuns);
    const runsByTask = await listTaskRuns(normalizedLimitRuns);

    return ADMIN_TASK_DEFINITIONS.map((task, index) => {
      const runs = runsByTask.get(task.name) ?? [];
      return {
        id: String(index + 1),
        key: task.name,
        name: task.label,
        description: task.description,
        lastRun: runs[0] ?? null,
        runs,
      };
    });
  } catch {
    return ADMIN_TASK_DEFINITIONS.map((task, index) => ({
      id: String(index + 1),
      key: task.name,
      name: task.label,
      description: task.description,
      lastRun: null,
      runs: [],
    }));
  }
}

function mapResultRowToRun(
  task: (typeof ADMIN_TASK_DEFINITIONS)[number],
  row: TaskResultRow
): AdminTaskRun {
  const parsed = parseTaskResult(row.result_json);
  const summaryLower = parsed.summary.toLowerCase();
  const isPending =
    parsed.workerState === "queued" ||
    parsed.workerState === "running" ||
    parsed.workerState === "failed-awaiting-retry" ||
    summaryLower.includes("queued") ||
    summaryLower.includes("running") ||
    summaryLower.includes("waiting for retry");

  return {
    id: String(row.job_id),
    taskKey: task.name,
    taskName: task.label,
    startedAt: toIso(row.created_at) || new Date().toISOString(),
    finishedAt: isPending ? null : toIso(row.created_at),
    dryRun: parsed.dryRun,
    status: parsed.status,
    summary: parsed.summary,
    details: parsed.details,
  };
}

function parseTaskResult(resultJson: string) {
  try {
    const parsed = JSON.parse(resultJson) as {
      status?: unknown;
      dryRun?: unknown;
      summary?: unknown;
      details?: unknown;
    };

    return {
      status: parsed.status === "FAILED" ? ("FAILED" as const) : ("SUCCESS" as const),
      dryRun: Boolean(parsed.dryRun),
      summary: toSummaryText(parsed.summary),
      details: toDetailsText(parsed.details),
      workerState: extractWorkerState(parsed.details),
    };
  } catch {
    return {
      status: "SUCCESS" as const,
      dryRun: false,
      summary: "Task completed",
      details: resultJson,
      workerState: null,
    };
  }
}

function mapQueuedRowToRun(
  task: (typeof ADMIN_TASK_DEFINITIONS)[number],
  row: JobViewRow,
  dryRun = false
): AdminTaskRun {
  let workerState = "queued";
  if (row.last_error) {
    workerState = "failed-awaiting-retry";
  } else if (row.locked_at) {
    workerState = "running";
  }
  let summary = "Job queued";
  if (row.last_error) {
    summary = "Job failed and is waiting for retry";
  } else if (row.locked_at) {
    summary = "Job running";
  }

  return {
    id: String(row.id),
    taskKey: task.name,
    taskName: task.label,
    startedAt: toIso(row.run_at) || toIso(row.created_at) || new Date().toISOString(),
    finishedAt: null,
    dryRun,
    status: row.last_error ? "FAILED" : "SUCCESS",
    summary,
    details: JSON.stringify(
      {
        state: workerState,
        attempts: row.attempts,
        maxAttempts: row.max_attempts,
        lastError: row.last_error,
      },
      null,
      2
    ),
  };
}

async function listTaskRuns(limitRuns: number) {
  const taskNames = ADMIN_TASK_DEFINITIONS.map((task) => task.name);

  const resultRows = await prisma.$queryRaw<TaskResultRow[]>(Prisma.sql`
    SELECT id, job_id, task_identifier, result_json, created_at
    FROM (
      SELECT
        id,
        job_id,
        task_identifier,
        result_json,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY task_identifier ORDER BY created_at DESC, id DESC) AS rn
      FROM shortbox.admin_task_result
      WHERE task_identifier IN (${Prisma.join(taskNames)})
    ) ranked
    WHERE ranked.rn <= ${limitRuns}
    ORDER BY task_identifier ASC, created_at DESC, id DESC
  `);

  const runsByTask = new Map<AdminTaskName, AdminTaskRun[]>();
  for (const task of ADMIN_TASK_DEFINITIONS) {
    runsByTask.set(task.name, []);
  }

  for (const row of resultRows) {
    const task = ADMIN_TASK_DEFINITIONS.find((entry) => entry.name === row.task_identifier);
    if (!task) continue;
    runsByTask.get(task.name)?.push(mapResultRowToRun(task, row));
  }

  try {
    const queuedRows = await prisma.$queryRaw<JobViewRow[]>(Prisma.sql`
      SELECT id, task_identifier, run_at, created_at, locked_at, attempts, max_attempts, last_error
      FROM (
        SELECT
          id,
          task_identifier,
          run_at,
          created_at,
          locked_at,
          attempts,
          max_attempts,
          last_error,
          ROW_NUMBER() OVER (PARTITION BY task_identifier ORDER BY created_at DESC, id DESC) AS rn
        FROM graphile_worker.jobs
        WHERE task_identifier IN (${Prisma.join(taskNames)})
      ) queued
      WHERE queued.rn <= ${limitRuns}
      ORDER BY task_identifier ASC, created_at DESC, id DESC
    `);

    for (const row of queuedRows) {
      const task = ADMIN_TASK_DEFINITIONS.find((entry) => entry.name === row.task_identifier);
      if (!task) continue;

      const existingRuns = runsByTask.get(task.name) ?? [];
      const existingRunIndex = existingRuns.findIndex((run) => run.id === String(row.id));

      if (existingRunIndex >= 0) {
        const existingRun = existingRuns[existingRunIndex];
        if (existingRun.finishedAt === null) {
          existingRuns[existingRunIndex] = mapQueuedRowToRun(task, row, existingRun.dryRun);
        }
        runsByTask.set(task.name, existingRuns);
        continue;
      }

      existingRuns.push(mapQueuedRowToRun(task, row));
      runsByTask.set(task.name, existingRuns);
    }
  } catch {
    // graphile_worker may not be available in every local setup
  }

  for (const [taskName, runs] of runsByTask.entries()) {
    runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    runsByTask.set(taskName, runs.slice(0, limitRuns));
  }

  return runsByTask;
}

function normalizeLimitRuns(limitRuns?: number): number {
  if (!Number.isFinite(limitRuns) || Number(limitRuns) <= 0) return 10;
  return Math.min(Math.trunc(Number(limitRuns)), 50);
}

function toIso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractWorkerState(details: unknown) {
  if (!details || typeof details !== "object") return null;
  const rawState = (details as { state?: unknown }).state;
  return rawState === "queued" || rawState === "running" || rawState === "failed-awaiting-retry"
    ? rawState
    : null;
}

function toDetailsText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return readPrimitiveText(value);
  }
}

function toSummaryText(value: unknown): string {
  const summary = readPrimitiveText(value).trim();
  return summary || "Task completed";
}

function readPrimitiveText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
