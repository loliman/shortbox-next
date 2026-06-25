import {
  readActivePreviewImportQueue,
  replaceActivePreviewImportQueue,
  clearActivePreviewImportQueue,
  skipUntilInActivePreviewImportQueue
} from "./preview-import-session";
import { prisma } from "../prisma/client";
import { readServerSession } from "./session";
import type { PreviewImportQueue } from "../../types/preview-import";

jest.mock("./session", () => ({
  readServerSession: jest.fn(),
}));

const mockReadServerSession = readServerSession as jest.MockedFunction<typeof readServerSession>;

describe("preview-import-session with user coupling", () => {
  const mockQueue1: PreviewImportQueue = {
    fileName: "test1.pdf",
    drafts: [
      {
        id: "draft-1",
        status: "pending",
        issueNumber: "1",
        seriesTitle: "Test Title",
        volume: 1,
        publisherName: "Test Publisher",
        isUs: false,
        format: "Heft",
        stories: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockQueue2: PreviewImportQueue = {
    fileName: "test2.pdf",
    drafts: [
      {
        id: "draft-2",
        status: "pending",
        issueNumber: "2",
        seriesTitle: "Test Title 2",
        volume: 2,
        publisherName: "Test Publisher",
        isUs: false,
        format: "Heft",
        stories: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Clear test-specific sessions from db
    await prisma.session.deleteMany({
      where: {
        sid: {
          in: ["usr-q-user-A", "usr-q-user-B"],
        },
      },
    });
    mockReadServerSession.mockReset();
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: {
        sid: {
          in: ["usr-q-user-A", "usr-q-user-B"],
        },
      },
    });
  });

  it("should return null if no user is logged in", async () => {
    mockReadServerSession.mockResolvedValue(null);
    const result = await readActivePreviewImportQueue();
    expect(result).toBeNull();
  });

  it("should throw if trying to replace queue when not logged in", async () => {
    mockReadServerSession.mockResolvedValue(null);
    await expect(replaceActivePreviewImportQueue(mockQueue1)).rejects.toThrow(
      "Keine aktive Admin-Session gefunden"
    );
  });

  it("should store and retrieve queue for user A, isolate from user B, and survive session changes", async () => {
    // 1. Log in as user A
    mockReadServerSession.mockResolvedValue({
      loggedIn: true,
      userId: "user-A",
      userName: "Admin A",
      canWrite: true,
      canAdmin: true,
    });

    // 2. Set queue for user A
    await replaceActivePreviewImportQueue(mockQueue1);

    // 3. Read queue for user A and verify
    const activeQueueA = await readActivePreviewImportQueue();
    expect(activeQueueA).not.toBeNull();
    expect(activeQueueA?.queue.fileName).toBe("test1.pdf");
    expect(activeQueueA?.currentDraft.id).toBe("draft-1");

    // 4. Log in as user B
    mockReadServerSession.mockResolvedValue({
      loggedIn: true,
      userId: "user-B",
      userName: "Admin B",
      canWrite: true,
      canAdmin: true,
    });

    // 5. Read queue for user B and verify it is empty (isolated)
    const activeQueueBBefore = await readActivePreviewImportQueue();
    expect(activeQueueBBefore).toBeNull();

    // 6. Set different queue for user B
    await replaceActivePreviewImportQueue(mockQueue2);

    const activeQueueBAfter = await readActivePreviewImportQueue();
    expect(activeQueueBAfter?.queue.fileName).toBe("test2.pdf");

    // 7. Switch back to user A (simulating device change / session refresh)
    mockReadServerSession.mockResolvedValue({
      loggedIn: true,
      userId: "user-A",
      userName: "Admin A",
      canWrite: true,
      canAdmin: true,
    });

    // 8. Verify user A's queue is still there intact
    const activeQueueAAgain = await readActivePreviewImportQueue();
    expect(activeQueueAAgain?.queue.fileName).toBe("test1.pdf");

    // 9. Clear user A's queue
    await clearActivePreviewImportQueue();
    expect(await readActivePreviewImportQueue()).toBeNull();

    // 10. Verify user B's queue is unaffected
    mockReadServerSession.mockResolvedValue({
      loggedIn: true,
      userId: "user-B",
      userName: "Admin B",
      canWrite: true,
      canAdmin: true,
    });
    const activeQueueBFinal = await readActivePreviewImportQueue();
    expect(activeQueueBFinal?.queue.fileName).toBe("test2.pdf");
  });

  it("should skip until target draft forward and mark intermediate drafts as skipped", async () => {
    mockReadServerSession.mockResolvedValue({
      loggedIn: true,
      userId: "user-A",
      userName: "Admin A",
      canWrite: true,
      canAdmin: true,
    });

    const queueWithThreeDrafts: PreviewImportQueue = {
      id: "q3",
      fileName: "test3.pdf",
      drafts: [
        {
          id: "draft-1",
          status: "pending",
          issueCode: "code-1",
          sourceTitle: "Source Title 1",
          warnings: [],
          values: {
            number: "1",
            title: "Issue 1",
            series: { title: "Test Title 1", publisher: { name: "Test Pub", us: false } },
          } as any,
        },
        {
          id: "draft-2",
          status: "pending",
          issueCode: "code-2",
          sourceTitle: "Source Title 2",
          warnings: [],
          values: {
            number: "2",
            title: "Issue 2",
            series: { title: "Test Title 2", publisher: { name: "Test Pub", us: false } },
          } as any,
        },
        {
          id: "draft-3",
          status: "pending",
          issueCode: "code-3",
          sourceTitle: "Source Title 3",
          warnings: [],
          values: {
            number: "3",
            title: "Issue 3",
            series: { title: "Test Title 3", publisher: { name: "Test Pub", us: false } },
          } as any,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await replaceActivePreviewImportQueue(queueWithThreeDrafts);

    // Skip until draft-3
    const nextQueue = await skipUntilInActivePreviewImportQueue("draft-1", "draft-3");
    expect(nextQueue).not.toBeNull();
    expect(nextQueue?.currentDraft.id).toBe("draft-3");
    expect(nextQueue?.currentDraftIndex).toBe(2);
    
    // Verify intermediate drafts' status is "skipped"
    expect(nextQueue?.queue.drafts[0].status).toBe("skipped");
    expect(nextQueue?.queue.drafts[1].status).toBe("skipped");
    expect(nextQueue?.queue.drafts[2].status).toBe("pending");
  });

  it("should throw if trying to skip backward or to same draft", async () => {
    mockReadServerSession.mockResolvedValue({
      loggedIn: true,
      userId: "user-A",
      userName: "Admin A",
      canWrite: true,
      canAdmin: true,
    });

    const queueWithThreeDrafts: PreviewImportQueue = {
      id: "q4",
      fileName: "test3.pdf",
      drafts: [
        {
          id: "draft-1",
          status: "pending",
          issueCode: "code-1",
          sourceTitle: "Source Title 1",
          warnings: [],
          values: {
            number: "1",
            title: "Issue 1",
            series: { title: "Test Title 1", publisher: { name: "Test Pub", us: false } },
          } as any,
        },
        {
          id: "draft-2",
          status: "pending",
          issueCode: "code-2",
          sourceTitle: "Source Title 2",
          warnings: [],
          values: {
            number: "2",
            title: "Issue 2",
            series: { title: "Test Title 2", publisher: { name: "Test Pub", us: false } },
          } as any,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await replaceActivePreviewImportQueue(queueWithThreeDrafts);

    // Skip to same draft should throw
    await expect(skipUntilInActivePreviewImportQueue("draft-1", "draft-1")).rejects.toThrow(
      "Man kann nur vorwärts springen"
    );

    // Skip backward should throw (simulated with target as draft-1 while current is draft-2)
    const activeQueue = await readActivePreviewImportQueue();
    if (activeQueue) {
      activeQueue.queue.drafts[0].status = "skipped";
      await replaceActivePreviewImportQueue(activeQueue.queue);
    }

    await expect(skipUntilInActivePreviewImportQueue("draft-2", "draft-1")).rejects.toThrow(
      "Man kann nur vorwärts springen"
    );
  });
});
