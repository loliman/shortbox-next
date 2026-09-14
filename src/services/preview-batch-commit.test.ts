import { commitStagedPreviewImport } from "./preview-batch-commit";
import { readStagedPreviewImport, saveStagedPreviewImport } from "../lib/server/preview-import-session";
import { createIssue } from "../lib/server/issues-write";
import type { StagedPreviewImport } from "../types/preview-import";

jest.mock("../lib/server/preview-import-session");
jest.mock("../lib/server/issues-write");
jest.mock("../lib/server/revalidate", () => ({
  invalidateNavigationCache: jest.fn(),
}));

describe("preview-batch-commit", () => {
  const mockReadStaged = readStagedPreviewImport as jest.MockedFunction<typeof readStagedPreviewImport>;
  const mockSaveStaged = saveStagedPreviewImport as jest.MockedFunction<typeof saveStagedPreviewImport>;
  const mockCreateIssue = createIssue as jest.MockedFunction<typeof createIssue>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should_keepPendingReviewAndMarkCommitted_when_partiallyCommitted", async () => {
    const staged: StagedPreviewImport = {
      id: "pv-123",
      previewNumber: 123,
      title: "Panini Vorschau 123",
      fileName: "pv123.pdf",
      status: "PENDING_REVIEW",
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
      totalDrafts: 2,
      inScopeDrafts: 2,
      readyCount: 2,
      newSeriesCount: 0,
      duplicateCount: 0,
      drafts: [
        {
          id: "d-1",
          sourceTitle: "SPIDER-MAN 11",
          category: "marvel",
          inScope: true,
          selected: true,
          status: "READY",
          isVariant: false,
          series: { title: "Spider-Man", volume: 1, isNew: false, publisherName: "Panini" },
          issue: { number: "11", title: "Spider-Man", storiesCount: 0 },
          rawDraft: {
            id: "d-1",
            sourceTitle: "SPIDER-MAN 11",
            status: "pending",
            warnings: [],
            values: {
              title: "Spider-Man",
              series: { title: "Spider-Man", volume: 1, publisher: { name: "Panini", us: false } },
              number: "11",
              variant: "",
              cover: null,
              format: "Heft",
              releasedate: "",
              price: "5,99",
              individuals: [],
              addinfo: "",
              stories: [],
              copyBatch: { enabled: false, count: 1, prefix: "" },
            },
          },
        },
        {
          id: "d-2",
          sourceTitle: "SPIDER-MAN 12",
          category: "marvel",
          inScope: true,
          selected: true,
          status: "READY",
          isVariant: false,
          series: { title: "Spider-Man", volume: 1, isNew: false, publisherName: "Panini" },
          issue: { number: "12", title: "Spider-Man", storiesCount: 0 },
          rawDraft: {
            id: "d-2",
            sourceTitle: "SPIDER-MAN 12",
            status: "pending",
            warnings: [],
            values: {
              title: "Spider-Man",
              series: { title: "Spider-Man", volume: 1, publisher: { name: "Panini", us: false } },
              number: "12",
              variant: "",
              cover: null,
              format: "Heft",
              releasedate: "",
              price: "5,99",
              individuals: [],
              addinfo: "",
              stories: [],
              copyBatch: { enabled: false, count: 1, prefix: "" },
            },
          },
        },
      ],
    };

    mockReadStaged.mockResolvedValue(staged);
    mockCreateIssue.mockResolvedValue({ success: true, issue: { id: "new-issue-1" } } as never);

    // Commit only d-1
    const result = await commitStagedPreviewImport(["d-1"]);

    expect(result.success).toBe(true);
    expect(result.committedCount).toBe(1);
    expect(result.skippedCount).toBe(1);

    // Verify d-1 was updated
    expect(staged.drafts[0].status).toBe("COMMITTED");
    expect(staged.drafts[0].selected).toBe(false);

    // Verify d-2 remains READY
    expect(staged.drafts[1].status).toBe("READY");

    // Verify staged.status remains PENDING_REVIEW because d-2 is uncommitted
    expect(staged.status).toBe("PENDING_REVIEW");
    expect(staged.readyCount).toBe(1);

    // Verify saveStagedPreviewImport was called
    expect(mockSaveStaged).toHaveBeenCalledWith(staged);
  });

  it("should_setCommittedStatus_when_allDraftsCommitted", async () => {
    const staged: StagedPreviewImport = {
      id: "pv-123",
      previewNumber: 123,
      title: "Panini Vorschau 123",
      fileName: "pv123.pdf",
      status: "PENDING_REVIEW",
      createdAt: "2026-09-13T00:00:00.000Z",
      updatedAt: "2026-09-13T00:00:00.000Z",
      totalDrafts: 1,
      inScopeDrafts: 1,
      readyCount: 1,
      newSeriesCount: 0,
      duplicateCount: 0,
      drafts: [
        {
          id: "d-1",
          sourceTitle: "SPIDER-MAN 11",
          category: "marvel",
          inScope: true,
          selected: true,
          status: "READY",
          isVariant: false,
          series: { title: "Spider-Man", volume: 1, isNew: false, publisherName: "Panini" },
          issue: { number: "11", title: "Spider-Man", storiesCount: 0 },
          rawDraft: {
            id: "d-1",
            sourceTitle: "SPIDER-MAN 11",
            status: "pending",
            warnings: [],
            values: {
              title: "Spider-Man",
              series: { title: "Spider-Man", volume: 1, publisher: { name: "Panini", us: false } },
              number: "11",
              variant: "",
              cover: null,
              format: "Heft",
              releasedate: "",
              price: "5,99",
              individuals: [],
              addinfo: "",
              stories: [],
              copyBatch: { enabled: false, count: 1, prefix: "" },
            },
          },
        },
      ],
    };

    mockReadStaged.mockResolvedValue(staged);
    mockCreateIssue.mockResolvedValue({ success: true, issue: { id: "new-issue-1" } } as never);

    const result = await commitStagedPreviewImport(["d-1"]);

    expect(result.success).toBe(true);
    expect(result.committedCount).toBe(1);
    expect(result.skippedCount).toBe(0);
    expect(staged.drafts[0].status).toBe("COMMITTED");
    expect(staged.status).toBe("COMMITTED");
  });
});
