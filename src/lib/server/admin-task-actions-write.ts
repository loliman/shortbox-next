import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

type QueueAdminTaskResultInput = {
  jobId: string;
  taskKey: string;
  dryRun: boolean;
};

export async function queueAdminTaskResult(input: QueueAdminTaskResultInput) {
  const { jobId, taskKey, dryRun } = input;

  return prisma.$executeRaw(Prisma.sql`
    INSERT INTO shortbox.admin_task_result (job_id, task_identifier, result_json, created_at)
    VALUES (
      ${jobId},
      ${taskKey},
      ${JSON.stringify({
        status: "SUCCESS",
        dryRun,
        summary: "Job queued",
        details: {
          state: "queued",
          attempts: 0,
          maxAttempts: 1,
          lastError: null,
        },
      })},
      NOW()
    )
    ON CONFLICT (job_id)
    DO UPDATE SET
      task_identifier = EXCLUDED.task_identifier,
      result_json = EXCLUDED.result_json,
      created_at = EXCLUDED.created_at
  `);
}
