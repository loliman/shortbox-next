import { prisma } from "../lib/prisma/client";
import { updateStoryFilterFlagsForIssue } from "../lib/server/story-filter-write";

const DEFAULT_BATCH_SIZE = 250;

export type UpdateStoryFiltersOptions = {
  dryRun?: boolean;
  batchSize?: number;
};

export type UpdateStoryFiltersReport = {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  issueCount: number;
  batchSize: number;
  batchCount: number;
  processed: number;
};

const resolveBatchSize = (value?: number): number => {
  const envBatchSize = Number.parseInt(process.env.STORY_FILTER_BATCH_SIZE || "", 10);
  const selected = typeof value === "number" ? value : envBatchSize;
  if (!Number.isFinite(selected) || selected <= 0) return DEFAULT_BATCH_SIZE;
  return Math.trunc(selected);
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export async function runUpdateStoryFilters(
  options?: UpdateStoryFiltersOptions
): Promise<UpdateStoryFiltersReport | null> {
  const dryRun = Boolean(options?.dryRun);
  const batchSize = resolveBatchSize(options?.batchSize);
  const startedAt = new Date().toISOString();

  try {
    const deIssues = await prisma.issue.findMany({
      select: { id: true },
      where: {
        series: {
          publisher: {
            original: false,
          },
        },
      },
      orderBy: [{ id: "asc" }],
    });

    const issueIds = deIssues.map((issue) => Number(issue.id || 0)).filter((id) => id > 0);
    const batches = chunk(issueIds, batchSize);

    let processed = 0;

    for (const batch of batches) {
      if (dryRun) {
        processed += batch.length;
      } else {
        for (const issueId of batch) {
          await updateStoryFilterFlagsForIssue(issueId);
          processed += 1;
        }
      }
    }

    return {
      dryRun,
      startedAt,
      finishedAt: new Date().toISOString(),
      issueCount: issueIds.length,
      batchSize,
      batchCount: batches.length,
      processed,
    };
  } catch {
    return null;
  }
}
