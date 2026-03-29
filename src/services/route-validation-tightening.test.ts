import * as autocompleteRead from "@/src/lib/read/autocomplete-read";
import * as authWrite from "@/src/lib/server/auth-write";
import { POST as autocompletePost } from "@/app/api/public-autocomplete/route";
import { POST as loginPost } from "@/app/api/auth/login/route";

jest.mock("@/src/lib/read/autocomplete-read", () => ({
  readAutocompleteItems: jest.fn(),
}));

jest.mock("@/src/lib/server/auth-write", () => ({
  loginUser: jest.fn(),
}));

describe("public-autocomplete route", () => {
  it("should_return_400_when_payload_is_invalid", async () => {
    const request = new Request("http://localhost/api/public-autocomplete", {
      method: "POST",
      body: JSON.stringify({ source: "invalid" }),
      headers: { "content-type": "application/json" },
    });

    const response = await autocompletePost(request as never);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: expect.any(String) });
  });

  it("should_delegate_and_return_data_when_payload_is_valid", async () => {
    const readAutocompleteItemsMock = jest.mocked(autocompleteRead.readAutocompleteItems);
    readAutocompleteItemsMock.mockResolvedValueOnce({
      items: [{ name: "Marvel", us: true }],
      hasMore: false,
    });

    const request = new Request("http://localhost/api/public-autocomplete", {
      method: "POST",
      body: JSON.stringify({
        source: "publishers",
        variables: { pattern: "Mar" },
        offset: 0,
        limit: 10,
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await autocompletePost(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ items: [{ name: "Marvel", us: true }], hasMore: false });
    expect(readAutocompleteItemsMock).toHaveBeenCalledWith({
      source: "publishers",
      variables: { pattern: "Mar" },
      offset: 0,
      limit: 10,
    });
  });
});

describe("auth/login route", () => {
  it("should_return_400_when_credentials_are_invalid", async () => {
    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ credentials: { name: "" } }),
      headers: { "content-type": "application/json" },
    });

    const response = await loginPost(request as never);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json).toEqual({ error: expect.any(String) });
  });

  it("should_login_and_return_user_when_credentials_are_valid", async () => {
    const loginUserMock = jest.mocked(authWrite.loginUser);
    loginUserMock.mockResolvedValueOnce({
      id: 1,
      userId: "admin",
      userName: "Admin",
      canWrite: true,
      canAdmin: true,
      loggedIn: true,
      sessionId: "session-123",
      createdAt: new Date(),
      updatedAt: new Date(),
      username: "admin",
      passwordhash: "hash",
    } as never);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ credentials: { name: "admin", password: "secret" } }),
      headers: { "content-type": "application/json" },
    });

    const response = await loginPost(request as never);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      user: {
        id: 1,
        userId: "admin",
        loggedIn: true,
        userName: "Admin",
        canWrite: true,
        canAdmin: true,
      },
    });
    expect(loginUserMock).toHaveBeenCalledWith({ name: "admin", password: "secret" });
  });
});
