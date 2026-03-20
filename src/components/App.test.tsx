import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const clearStoreMock = vi.fn();
const contextSpy = vi.fn();
const sessionInvalidListeners: Array<() => void> = [];
let mockMode = false;
const apolloClientMock = {
  query: (...args: unknown[]) => queryMock(...args),
  clearStore: (...args: unknown[]) => clearStoreMock(...args),
};

vi.mock("@apollo/client", () => ({
  useApolloClient: () => apolloClientMock,
}));

vi.mock("./generic/AppContext", () => ({
  default: (props: { children?: unknown; session?: { loggedIn?: boolean } | null }) => {
    contextSpy(props);
    return (
      <>
        <div data-testid="session">{props.session?.loggedIn ? "in" : "out"}</div>
        {props.children}
      </>
    );
  },
}));

vi.mock("../app/mockMode", () => ({
  get isMockMode() {
    return mockMode;
  },
}));

vi.mock("../app/authEvents", () => ({
  subscribeSessionInvalid: (listener: () => void) => {
    sessionInvalidListeners.push(listener);
    return () => {};
  },
}));

vi.mock("../graphql/queriesTyped", () => ({
  me: { kind: "Document" },
}));

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    mockMode = false;
    queryMock.mockReset();
    queryMock.mockResolvedValue({ data: { me: null } });
    clearStoreMock.mockReset();
    contextSpy.mockReset();
    sessionInvalidListeners.length = 0;
  });

  it("boots authenticated state immediately in mock mode", async () => {
    mockMode = true;
    render(
      <App>
        <div data-testid="content">content</div>
      </App>
    );

    await waitFor(() => {
      expect(screen.getByTestId("session").textContent).toBe("in");
    });
    expect(queryMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("content").textContent).toBe("content");
  });

  it("loads session via me query in live mode", async () => {
    queryMock.mockResolvedValue({ data: { me: { id: "1" } } });
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("session").textContent).toBe("in");
    });
    expect(queryMock).toHaveBeenCalled();
  });

  it("handles query errors and session invalidation", async () => {
    queryMock.mockRejectedValue(new Error("boom"));
    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId("session").textContent).toBe("out");
    });

    expect(sessionInvalidListeners).toHaveLength(1);
    act(() => {
      sessionInvalidListeners[0]();
    });

    await waitFor(() => {
      expect(clearStoreMock).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("session").textContent).toBe("out");
    });
  });
});
