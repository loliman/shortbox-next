import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { Result, success, failure } from "@/src/types/result";

type QueueAdminTaskResultInput = {
  jobId: string;
  taskKey: string;
  dryRun: boolean;
};

export async function queueAdminTaskResult(input: QueueAdminTaskResultInput): Promise<Result<number>> {
  try {
    const { jobId, taskKey, dryRun } = input;

    const count = await prisma.$executeRaw(Prisma.sql`
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
    
    return success(count);
  } catch (error) {
    return failure(error as Error);
  }
}
