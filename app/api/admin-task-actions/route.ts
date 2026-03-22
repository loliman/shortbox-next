import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma/client";
import { requireApiAdminSession } from "@/src/lib/server/guards";
import { getWorkerUtils } from "@/src/lib/worker-utils";
import {
  ADMIN_TASK_DEFINITION_BY_NAME,
  ADMIN_TASK_DEFINITIONS,
  isAdminTaskName,
  type AdminTaskName,
  type AdminTaskPayloads,
} from "@/src/worker/task-registry";

type RunAdminTaskInput = {
  taskKey: string;
  dryRun?: boolean;
};

type JobViewRow = {
  id: string | number;
  locked_by: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAdminSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as {
      action?: "run" | "release-locks";
      input?: Record<string, unknown>;
    };

    if (body.action === "release-locks") {
      const taskNames = ADMIN_TASK_DEFINITIONS.map((task) => task.name);
      const lockedWorkers = await prisma.$queryRaw<Array<{ locked_by: string | null }>>(Prisma.sql`
        SELECT DISTINCT locked_by
        FROM graphile_worker.jobs
        WHERE locked_at IS NOT NULL
          AND locked_by IS NOT NULL
          AND task_identifier IN (${Prisma.join(taskNames)})
      `);

      const workerIds = lockedWorkers
        .map((row) => String(row.locked_by || "").trim())
        .filter((workerId) => workerId.length > 0);

      const workerUtils = await getWorkerUtils();
      if (workerIds.length > 0) {
        await workerUtils.forceUnlockWorkers(workerIds);
      }

      const jobRows = await prisma.$queryRaw<JobViewRow[]>(Prisma.sql`
        SELECT id, locked_by
        FROM graphile_worker.jobs
        WHERE task_identifier IN (${Prisma.join(taskNames)})
      `);

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

    const taskKey = String(body.input?.taskKey || "").trim();
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

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO shortbox.admin_task_result (job_id, task_identifier, result_json, created_at)
      VALUES (
        ${String(job.id)},
        ${taskKey},
        ${JSON.stringify({
          status: "SUCCESS",
          dryRun: Boolean(payload.dryRun),
          summary: "Job queued",
          details: queuedDetails,
        })},
        NOW()
      )
      ON CONFLICT (job_id)
      DO UPDATE SET
        task_identifier = EXCLUDED.task_identifier,
        result_json = EXCLUDED.result_json,
        created_at = EXCLUDED.created_at
    `);

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
  } catch {
    return NextResponse.json({ error: "Admin-Task-Aktion fehlgeschlagen" }, { status: 400 });
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
