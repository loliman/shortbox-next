import { findCurrentDraft, findPreviousSkippedDraftIndex } from "./preview-import-session-shared";
import type { PreviewImportQueue } from "../../types/preview-import";

function buildQueue(statuses: Array<"pending" | "skipped" | "created">): PreviewImportQueue {
  return {
    id: "queue-1",
    fileName: "preview.pdf",
    createdAt: "2026-03-30T00:00:00.000Z",
    updatedAt: "2026-03-30T00:00:00.000Z",
    drafts: statuses.map((status, index) => ({
      id: `draft-${index + 1}`,
      sourceTitle: `Draft ${index + 1}`,
      status,
      warnings: [],
      values: {} as never,
    })),
  };
}

describe("preview-import-session-shared", () => {
  describe("findCurrentDraft", () => {
    it("returns the first pending draft", () => {
      const queue = buildQueue(["created", "skipped", "pending", "pending"]);

      expect(findCurrentDraft(queue)).toMatchObject({
        index: 2,
        draft: { id: "draft-3" },
      });
    });
  });

  describe("findPreviousSkippedDraftIndex", () => {
    it("returns the closest skipped draft before the current draft", () => {
      const queue = buildQueue(["created", "skipped", "created", "skipped", "pending"]);

      expect(findPreviousSkippedDraftIndex(queue)).toBe(3);
    });

    it("returns -1 when there is no skipped draft before the current draft", () => {
      const queue = buildQueue(["created", "created", "pending"]);

      expect(findPreviousSkippedDraftIndex(queue)).toBe(-1);
    });
  });
});
