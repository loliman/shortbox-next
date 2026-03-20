import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma/client";
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
  reimportScopeKind?: "ALL_US" | "PUBLISHER" | "SERIES" | "ISSUE";
  publisherId?: string;
  seriesId?: string;
  issueId?: string;
};

type JobViewRow = {
  id: string | number;
  locked_by: string | null;
};

export async function POST(request: NextRequest) {
  try {
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
      reimportScopeKind: body.input?.reimportScopeKind as RunAdminTaskInput["reimportScopeKind"],
      publisherId: stringOrUndefined(body.input?.publisherId),
      seriesId: stringOrUndefined(body.input?.seriesId),
      issueId: stringOrUndefined(body.input?.issueId),
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

function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
}

function stringOrUndefined(value: unknown) {
  const normalized = String(value || "").trim();
  return normalized === "" ? undefined : normalized;
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

  if (taskKey === "reimport-us") {
    const scopeKind = input.reimportScopeKind;
    if (!scopeKind || scopeKind === "ALL_US") {
      return { dryRun, scope: { kind: "all-us" } };
    }

    if (scopeKind === "PUBLISHER") {
      const publisherId = parsePositiveInt(input.publisherId);
      if (!publisherId) throw new Error("publisherId is required for PUBLISHER scope");
      return { dryRun, scope: { kind: "publisher", publisherId } };
    }

    if (scopeKind === "SERIES") {
      const seriesId = parsePositiveInt(input.seriesId);
      if (!seriesId) throw new Error("seriesId is required for SERIES scope");
      return { dryRun, scope: { kind: "series", seriesId } };
    }

    if (scopeKind === "ISSUE") {
      const issueId = parsePositiveInt(input.issueId);
      if (!issueId) throw new Error("issueId is required for ISSUE scope");
      return { dryRun, scope: { kind: "issue", issueId } };
    }
  }

  if (taskKey === "rebuild-search-index") {
    return { dryRun };
  }

  return { dryRun };
}
