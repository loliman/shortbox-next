/** @jest-environment jsdom */
import { getDefaultDrawerOpen } from "./useLayoutChromeState";

describe("useLayoutChromeState", () => {
  it("should_keep_temporary_drawers_closed_by_default", () => {
    expect(
      getDefaultDrawerOpen({
        navWide: true,
        temporaryDrawer: true,
      })
    ).toBe(false);
  });

  it("should_open_non_temporary_drawers_when_nav_is_wide", () => {
    expect(
      getDefaultDrawerOpen({
        navWide: true,
        temporaryDrawer: false,
      })
    ).toBe(true);
  });

  it("should_prefer_explicit_drawer_state", () => {
    expect(
      getDefaultDrawerOpen({
        drawerOpen: true,
        navWide: false,
        temporaryDrawer: true,
      })
    ).toBe(true);
  });
});
