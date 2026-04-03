import { NextRequest, NextResponse } from "next/server";
import { readAdminTaskJobViews, readLockedAdminTaskWorkers } from "@/src/lib/read/admin-task-actions-read";
import { queueAdminTaskResult } from "@/src/lib/server/admin-task-actions-write";
import { requireApiAdminSession } from "@/src/lib/server/guards";
import { getWorkerUtils } from "@/src/lib/worker-utils";
import {
  ADMIN_TASK_DEFINITION_BY_NAME,
  ADMIN_TASK_DEFINITIONS,
  isAdminTaskName,
  type AdminTaskName,
  type AdminTaskPayloads,
} from "@/src/worker/task-registry";
import * as Yup from "yup";

const AdminTaskBodySchema = Yup.object({
  action: Yup.string().oneOf(["run", "release-locks"]).optional(),
  input: Yup.object({
    taskKey: Yup.string().optional(),
    dryRun: Yup.boolean().optional(),
  }).optional(),
});

type RunAdminTaskInput = {
  taskKey: string;
  dryRun?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAdminSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await AdminTaskBodySchema.validate(rawBody, { stripUnknown: true });

    if (body.action === "release-locks") {
      const taskNames = ADMIN_TASK_DEFINITIONS.map((task) => task.name);
      const lockedWorkers = await readLockedAdminTaskWorkers(taskNames);

      const workerIds = lockedWorkers
        .map((row) => readTextValue(row.locked_by))
        .filter((workerId) => workerId.length > 0);

      const workerUtils = await getWorkerUtils();
      if (workerIds.length > 0) {
        await workerUtils.forceUnlockWorkers(workerIds);
      }

      const jobRows = await readAdminTaskJobViews(taskNames);

      const jobIds = jobRows.map((row) => String(row.id)).filter((jobId) => jobId.length > 0);
      let removedJobs = 0;
      if (jobIds.length > 0) {
        const completed = await workerUtils.completeJobs(jobIds);
        removedJobs = completed.length;
      }

      return NextResponse.json(
        { removedJobs },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const taskKey = readTextValue(body.input?.taskKey);
    if (!isAdminTaskName(taskKey)) {
      return NextResponse.json({ error: `Unknown admin task: ${taskKey}` }, { status: 400 });
    }
    const dryRun = Boolean(body.input?.dryRun);
    const payload = buildTaskPayload(taskKey, {
      taskKey,
      dryRun,
    });

    const workerUtils = await getWorkerUtils();
    const job = await workerUtils.addJob(taskKey, payload, { maxAttempts: 1 });
    const now = new Date().toISOString();
    const queuedDetails = {
      state: "queued",
      attempts: 0,
      maxAttempts: 1,
      lastError: null,
    };

    const queueRes = await queueAdminTaskResult({
      jobId: String(job.id),
      taskKey,
      dryRun: Boolean(payload.dryRun),
    });

    if (!queueRes.success) {
      console.error("Failed to queue tracking result:", queueRes.error);
    }

    return NextResponse.json(
      {
        run: {
          id: String(job.id),
          taskKey,
          taskName: ADMIN_TASK_DEFINITION_BY_NAME[taskKey].label,
          startedAt: now,
          finishedAt: null,
          dryRun,
          status: "SUCCESS",
          summary: `Job queued (${job.id})`,
          details: JSON.stringify({ payload, ...queuedDetails }, null, 2),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Admin-Task-Aktion fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function buildTaskPayload(
  taskKey: AdminTaskName,
  input: RunAdminTaskInput
): AdminTaskPayloads[AdminTaskName] {
  const dryRun = Boolean(input.dryRun);

  if (taskKey === "cleanup-db") {
    return { dryRun };
  }

  if (taskKey === "update-story-badges") {
    return { dryRun };
  }

  if (taskKey === "rebuild-search-index") {
    return { dryRun };
  }

  return { dryRun };
}

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
