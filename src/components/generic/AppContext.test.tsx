import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppContextProvider, { AppContext } from "./AppContext";

const mocks = vi.hoisted(() => ({
  responsive: {
    isPhone: false,
    isTablet: false,
    isDesktop: true,
    isLandscape: false,
    isPhonePortrait: false,
    isPhoneLandscape: false,
    isTabletLandscape: false,
    isCompact: false,
    navWide: true,
  },
}));

vi.mock("../../app/useResponsive", () => ({
  useResponsive: () => mocks.responsive,
}));

describe("AppContextProvider", () => {
  it("manages drawer, loading registry and auth helpers", () => {
    const setSession = vi.fn();
    let contextValue: any;

    const { rerender } = render(
      <AppContextProvider session={null} setSession={setSession}>
        <AppContext.Consumer>
          {(value) => {
            contextValue = value;
            return <div>ctx</div>;
          }}
        </AppContext.Consumer>
      </AppContextProvider>
    );

    expect(contextValue.drawerOpen).toBe(true);
    expect(contextValue.appIsLoading).toBe(false);
    expect(contextValue.isDesktop).toBe(true);

    act(() => {
      contextValue.toggleDrawer();
    });
    expect(contextValue.drawerOpen).toBe(false);

    act(() => {
      contextValue.registerLoadingComponent("Home");
      contextValue.registerLoadingComponent("Home");
    });
    expect(contextValue.appIsLoading).toBe(true);
    expect(contextValue.isComponentRegistered("Home")).toBe("Home");

    act(() => {
      contextValue.unregisterLoadingComponent("Home");
    });
    expect(contextValue.appIsLoading).toBe(false);
    expect(contextValue.isComponentRegistered("Home")).toBeUndefined();

    act(() => {
      contextValue.registerLoadingComponent("A");
      contextValue.resetLoadingComponents();
    });
    expect(contextValue.appIsLoading).toBe(false);

    act(() => {
      contextValue.handleLogin({ loggedIn: true });
      contextValue.handleLogout();
    });
    expect(setSession).toHaveBeenNthCalledWith(1, { loggedIn: true });
    expect(setSession).toHaveBeenNthCalledWith(2, null);

    mocks.responsive = { ...mocks.responsive, navWide: false };
    rerender(
      <AppContextProvider session={null} setSession={setSession}>
        <AppContext.Consumer>
          {(value) => {
            contextValue = value;
            return <div>ctx</div>;
          }}
        </AppContext.Consumer>
      </AppContextProvider>
    );
    expect(contextValue.drawerOpen).toBe(false);
  });
});
