import type { Task } from "graphile-worker";
import { runCheckPaniniPreviewPipeline } from "../../services/preview-auto-pipeline";
import { persistTaskResult } from "../task-results";

const task: Task = async (rawPayload, helpers) => {
  const triggeredBy = (rawPayload as Record<string, unknown>)?._cron ? "cron" : "manual";

  try {
    const result = await runCheckPaniniPreviewPipeline();

    await persistTaskResult(helpers, "check-panini-preview", {
      status: "SUCCESS",
      triggeredBy,
      summary: result.message,
      details: {
        action: result.action,
        preview: result.preview,
        staged: result.staged ? {
          id: result.staged.id,
          previewNumber: result.staged.previewNumber,
          inScopeDrafts: result.staged.inScopeDrafts,
          readyCount: result.staged.readyCount,
          newSeriesCount: result.staged.newSeriesCount,
        } : null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await persistTaskResult(helpers, "check-panini-preview", {
      status: "FAILED",
      triggeredBy,
      summary: message,
      details: {
        error: error instanceof Error ? error.stack || error.message : message,
      },
    });
    throw error;
  }
};

export default task;
