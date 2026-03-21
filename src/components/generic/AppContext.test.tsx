import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppContextProvider, {
  NavigationUiContext,
  ResponsiveContext,
  SessionContext,
} from "./AppContext";

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
    let sessionValue: any;
    let navigationValue: any;
    let responsiveValue: any;

    function TestConsumer() {
      sessionValue = React.useContext(SessionContext);
      navigationValue = React.useContext(NavigationUiContext);
      responsiveValue = React.useContext(ResponsiveContext);
      return <div>ctx</div>;
    }

    const { rerender } = render(
      <AppContextProvider session={null} setSession={setSession}>
        <TestConsumer />
      </AppContextProvider>
    );

    expect(navigationValue.drawerOpen).toBe(true);
    expect(navigationValue.appIsLoading).toBe(false);
    expect(responsiveValue.isDesktop).toBe(true);

    act(() => {
      navigationValue.toggleDrawer();
    });
    expect(navigationValue.drawerOpen).toBe(false);

    act(() => {
      navigationValue.registerLoadingComponent("Home");
      navigationValue.registerLoadingComponent("Home");
    });
    expect(navigationValue.appIsLoading).toBe(true);
    expect(navigationValue.isComponentRegistered("Home")).toBe("Home");

    act(() => {
      navigationValue.unregisterLoadingComponent("Home");
    });
    expect(navigationValue.appIsLoading).toBe(false);
    expect(navigationValue.isComponentRegistered("Home")).toBeUndefined();

    act(() => {
      navigationValue.registerLoadingComponent("A");
      navigationValue.resetLoadingComponents();
    });
    expect(navigationValue.appIsLoading).toBe(false);

    act(() => {
      sessionValue.handleLogin({ loggedIn: true });
      sessionValue.handleLogout();
    });
    expect(setSession).toHaveBeenNthCalledWith(1, { loggedIn: true });
    expect(setSession).toHaveBeenNthCalledWith(2, null);

    mocks.responsive = { ...mocks.responsive, navWide: false };
    rerender(
      <AppContextProvider session={null} setSession={setSession}>
        <TestConsumer />
      </AppContextProvider>
    );
    expect(navigationValue.drawerOpen).toBe(false);
  });
});
