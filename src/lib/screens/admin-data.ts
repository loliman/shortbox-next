import { prisma } from "../prisma/client";

const ADMIN_TASK_DEFINITIONS = [
  {
    key: "cleanup-db",
    name: "Cleanup",
    description: "Entfernt inkonsistente Daten in der Datenbank.",
  },
  {
    key: "update-story-badges",
    name: "Update Story Badges",
    description: "Berechnet Story Badges für alle Issues neu.",
  },
  {
    key: "reimport-us",
    name: "Reimport US Issues",
    description:
      "Crawlt US-Issues neu, korrigiert normale Datenabweichungen und markiert manuelle Konflikte.",
  },
  {
    key: "rebuild-search-index",
    name: "Rebuild Search Index",
    description: "Baut den QuickSearch-Index aus Publishern, Serien und Ausgaben neu auf.",
  },
  {
    key: "update-de-series-genres",
    name: "Update DE Series Genres",
    description:
      "Leitet Genres fuer DE-Serien aus verknuepften US-Stories und deren US-Serien ab.",
  },
] as const;

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

export async function getAdminTasks(limitRuns = 10) {
  try {
    const rows = await prisma.adminTaskResult.findMany({
      where: {
        taskIdentifier: {
          in: ADMIN_TASK_DEFINITIONS.map((entry) => entry.key),
        },
      },
      orderBy: [{ taskIdentifier: "asc" }, { createdAt: "desc" }, { id: "desc" }],
    });

    const runsByTask = new Map<string, AdminTaskRun[]>();
    ADMIN_TASK_DEFINITIONS.forEach((task) => runsByTask.set(task.key, []));

    rows.forEach((row) => {
      const taskRuns = runsByTask.get(row.taskIdentifier);
      const task = ADMIN_TASK_DEFINITIONS.find((entry) => entry.key === row.taskIdentifier);
      if (!taskRuns || !task) return;
      if (taskRuns.length >= limitRuns) return;
      taskRuns.push(mapResultRowToRun(task.key, task.name, row.jobId, row.createdAt, row.resultJson));
    });

    return ADMIN_TASK_DEFINITIONS.map((task, index) => {
      const runs = runsByTask.get(task.key) || [];
      return {
        id: String(index + 1),
        key: task.key,
        name: task.name,
        description: task.description,
        lastRun: runs[0] || null,
        runs,
      };
    });
  } catch {
    return ADMIN_TASK_DEFINITIONS.map((task, index) => ({
      id: String(index + 1),
      key: task.key,
      name: task.name,
      description: task.description,
      lastRun: null,
      runs: [],
    }));
  }
}

function mapResultRowToRun(
  taskKey: string,
  taskName: string,
  jobId: string,
  createdAt: Date,
  resultJson: string
): AdminTaskRun {
  const parsed = parseTaskResult(resultJson);
  const summaryLower = parsed.summary.toLowerCase();
  const isPending = summaryLower.includes("queued") || summaryLower.includes("running");

  return {
    id: String(jobId),
    taskKey,
    taskName,
    startedAt: createdAt.toISOString(),
    finishedAt: isPending ? null : createdAt.toISOString(),
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
      summary: String(parsed.summary || "Task completed"),
      details: toDetailsText(parsed.details),
    };
  } catch {
    return {
      status: "SUCCESS" as const,
      dryRun: false,
      summary: "Task completed",
      details: resultJson,
    };
  }
}

function toDetailsText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
