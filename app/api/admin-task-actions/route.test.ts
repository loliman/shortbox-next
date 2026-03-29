import { POST } from "./route";

jest.mock("@/src/lib/server/guards", () => ({
  requireApiAdminSession: jest.fn(async () => ({ response: null })),
}));

jest.mock("@/src/lib/read/admin-task-actions-read", () => ({
  readAdminTaskJobViews: jest.fn(async () => []),
  readLockedAdminTaskWorkers: jest.fn(async () => []),
}));

jest.mock("@/src/lib/server/admin-task-actions-write", () => ({
  queueAdminTaskResult: jest.fn(async () => ({ success: true, data: true })),
}));

jest.mock("@/src/lib/worker-utils", () => ({
  getWorkerUtils: jest.fn(async () => ({
    forceUnlockWorkers: jest.fn(async () => undefined),
    completeJobs: jest.fn(async () => []),
    addJob: jest.fn(async () => ({ id: "job-1" })),
  })),
}));

describe("admin-task-actions route", () => {
  it("should_return_400_when_task_is_unknown", async () => {
    const request = new Request("http://localhost/api/admin-task-actions", {
      method: "POST",
      body: JSON.stringify({ action: "run", input: { taskKey: "unknown-task" } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Unknown admin task: unknown-task" });
  });

  it("should_return_200_when_run_action_is_valid", async () => {
    const request = new Request("http://localhost/api/admin-task-actions", {
      method: "POST",
      body: JSON.stringify({ action: "run", input: { taskKey: "cleanup-db", dryRun: true } }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.run.taskKey).toBe("cleanup-db");
    expect(body.run.dryRun).toBe(true);
    expect(body.run.status).toBe("SUCCESS");
  });

  it("should_return_400_when_payload_is_invalid", async () => {
    const request = new Request("http://localhost/api/admin-task-actions", {
      method: "POST",
      body: JSON.stringify({ input: "invalid" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toHaveProperty("error");
  });
});
