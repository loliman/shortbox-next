import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FooterAuthLink from "./FooterAuthLink";

const mocks = vi.hoisted(() => ({
  mockMode: false,
  resetStoreMock: vi.fn(),
  runLogoutMock: vi.fn(),
  mutationOptions: null as null | {
    onCompleted?: (data: { logout?: boolean }) => void;
    onError?: (error: { graphQLErrors?: Array<{ message?: string }> }) => void;
  },
}));

vi.mock("@apollo/client", () => ({
  useApolloClient: () => ({
    resetStore: mocks.resetStoreMock,
  }),
  useMutation: (_doc: unknown, options: any) => {
    mocks.mutationOptions = options;
    return [mocks.runLogoutMock];
  },
}));

vi.mock("../../graphql/mutationsTyped", () => ({
  logout: { kind: "LogoutMutation" },
}));

vi.mock("../../app/mockMode", () => ({
  get isMockMode() {
    return mocks.mockMode;
  },
}));

describe("FooterAuthLink", () => {
  beforeEach(() => {
    mocks.mockMode = false;
    mocks.resetStoreMock.mockReset();
    mocks.runLogoutMock.mockReset();
    mocks.mutationOptions = null;
  });

  it("shows login link when user is logged out", () => {
    const navigate = vi.fn();
    render(<FooterAuthLink loggedIn={false} navigate={navigate} />);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(navigate).toHaveBeenCalledWith(null, "/login");
  });

  it("handles mock-mode logout without mutation", () => {
    mocks.mockMode = true;
    const enqueueSnackbar = vi.fn();
    const handleLogout = vi.fn();

    render(
      <FooterAuthLink loggedIn enqueueSnackbar={enqueueSnackbar} handleLogout={handleLogout} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(enqueueSnackbar).toHaveBeenCalledWith("Auf Wiedersehen!", { variant: "success" });
    expect(mocks.resetStoreMock).toHaveBeenCalledTimes(1);
    expect(handleLogout).toHaveBeenCalledTimes(1);
    expect(mocks.runLogoutMock).not.toHaveBeenCalled();
  });

  it("handles API logout success and failure branches", () => {
    const enqueueSnackbar = vi.fn();
    const handleLogout = vi.fn();

    mocks.runLogoutMock.mockImplementation(() => {
      mocks.mutationOptions?.onCompleted?.({ logout: true });
    });

    const { rerender } = render(
      <FooterAuthLink loggedIn enqueueSnackbar={enqueueSnackbar} handleLogout={handleLogout} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(enqueueSnackbar).toHaveBeenCalledWith("Auf Wiedersehen!", { variant: "success" });
    expect(handleLogout).toHaveBeenCalled();

    mocks.runLogoutMock.mockImplementation(() => {
      mocks.mutationOptions?.onCompleted?.({ logout: false });
    });
    rerender(
      <FooterAuthLink loggedIn enqueueSnackbar={enqueueSnackbar} handleLogout={handleLogout} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    expect(enqueueSnackbar).toHaveBeenCalledWith("Logout fehlgeschlagen", { variant: "error" });
  });

  it("handles API logout errors", () => {
    const enqueueSnackbar = vi.fn();
    mocks.runLogoutMock.mockImplementation(() => {
      mocks.mutationOptions?.onError?.({ graphQLErrors: [{ message: "boom" }] });
    });

    render(<FooterAuthLink loggedIn enqueueSnackbar={enqueueSnackbar} />);
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(enqueueSnackbar).toHaveBeenCalledWith("Logout fehlgeschlagen [boom]", {
      variant: "error",
    });
  });
});
