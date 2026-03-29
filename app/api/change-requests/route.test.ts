import { DELETE, PATCH, POST } from "./route";

const createIssueChangeRequest = jest.fn();
const discardChangeRequestById = jest.fn();
const acceptChangeRequestById = jest.fn();

jest.mock("@/src/lib/server/change-requests-write", () => ({
  createIssueChangeRequest: (...args: unknown[]) => createIssueChangeRequest(...args),
  discardChangeRequestById: (...args: unknown[]) => discardChangeRequestById(...args),
  acceptChangeRequestById: (...args: unknown[]) => acceptChangeRequestById(...args),
}));

jest.mock("@/src/lib/server/guards", () => ({
  requireApiAdminSession: jest.fn(async () => ({ response: null })),
}));

jest.mock("@/src/lib/server/revalidate", () => ({
  invalidateChangeRequestsCache: jest.fn(),
  invalidateNavigationCache: jest.fn(),
}));

describe("change-requests route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should_return_200_when_post_is_valid", async () => {
    createIssueChangeRequest.mockResolvedValue({ success: true, data: { id: 1 } });

    const request = new Request("http://localhost/api/change-requests", {
      method: "POST",
      body: JSON.stringify({ issue: {}, item: {} }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ item: { id: 1 } });
  });

  it("should_return_400_when_post_domain_fails", async () => {
    createIssueChangeRequest.mockResolvedValue({ success: false, error: "invalid" });

    const request = new Request("http://localhost/api/change-requests", {
      method: "POST",
      body: JSON.stringify({ issue: {}, item: {} }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "invalid" });
  });

  it("should_return_400_when_delete_id_is_invalid", async () => {
    const request = new Request("http://localhost/api/change-requests", {
      method: "DELETE",
      body: JSON.stringify({ id: null }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await DELETE(request as never);
    expect(response.status).toBe(400);
  });

  it("should_map_patch_failure_status_code_from_result", async () => {
    acceptChangeRequestById.mockResolvedValue({ success: false, error: "forbidden", statusCode: 403 });

    const request = new Request("http://localhost/api/change-requests", {
      method: "PATCH",
      body: JSON.stringify({ id: 1 }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request as never);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "forbidden" });
  });
});
