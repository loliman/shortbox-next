import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";

type LockedWorkerRow = {
  locked_by: string | null;
};

type JobViewRow = {
  id: string | number;
  locked_by: string | null;
};

export async function readLockedAdminTaskWorkers(taskNames: readonly string[]) {
  return prisma.$queryRaw<LockedWorkerRow[]>(Prisma.sql`
    SELECT DISTINCT locked_by
    FROM graphile_worker.jobs
    WHERE locked_at IS NOT NULL
      AND locked_by IS NOT NULL
      AND task_identifier IN (${Prisma.join(taskNames)})
  `);
}

export async function readAdminTaskJobViews(taskNames: readonly string[]) {
  return prisma.$queryRaw<JobViewRow[]>(Prisma.sql`
    SELECT id, locked_by
    FROM graphile_worker.jobs
    WHERE task_identifier IN (${Prisma.join(taskNames)})
  `);
}
