/** @jest-environment jsdom */
import React from "react";


const mocks = ({
  generateUrlMock: jest.fn(() => "/selected-path"),
});

jest.mock("../../lib/routes/hierarchy", () => ({
  HierarchyLevel: {
    PUBLISHER: "PUBLISHER",
    SERIES: "SERIES",
    ISSUE: "ISSUE",
  },
  generateSeoUrl: mocks.generateUrlMock,
}));

import AddFab from "./AddFab";

function walkElements(node: unknown, visitor: (element: any) => void) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((entry) => walkElements(entry, visitor));
    return;
  }
  if (!React.isValidElement(node)) return;

  const element = node as React.ReactElement<any>;
  visitor(element);
  React.Children.forEach(element.props?.children, (child) => {
    walkElements(child, visitor);
  });
}

function getSpeedDialBottomSx(instance: any): string {
  const tree = instance.render();
  let bottomSx: string | undefined;
  walkElements(tree, (element) => {
    if (element.props?.ariaLabel === "Erstellen" && element.props?.sx?.bottom) {
      bottomSx = element.props.sx.bottom;
    }
  });
  if (!bottomSx) throw new Error("SpeedDial not found");
  return bottomSx;
}

describe.skip("AddFab", () => {
  it("renders nothing without a session", () => {
    const instance = new (AddFab as any)({ session: null });
    expect(instance.render()).toBeNull();
  });

  it("toggles dial state and navigates for create actions", () => {
    const navigate = jest.fn();
    const instance = new (AddFab as any)({
      session: { loggedIn: true },
      level: "PUBLISHER",
      us: true,
      selected: { publisher: { name: "Marvel" } },
      navigate,
    });
    instance.setState = (updater: any) => {
      const next = typeof updater === "function" ? updater(instance.state) : updater;
      instance.state = { ...instance.state, ...next };
    };

    expect(instance.state.open).toBe(false);
    instance.handleClick();
    expect(instance.state.open).toBe(true);
    instance.handleClose();
    expect(instance.state.open).toBe(false);

    const tree = instance.render();
    const actions: Record<string, (event?: unknown) => void> = {};
    walkElements(tree, (element) => {
      if (element.props?.tooltipTitle && typeof element.props?.onClick === "function") {
        actions[element.props.tooltipTitle] = element.props.onClick;
      }
    });

    actions.Verlag?.({ button: 0 });
    actions.Serie?.({ button: 0 });
    actions.Ausgabe?.({ button: 0 });

    expect(navigate).toHaveBeenNthCalledWith(1, { button: 0 }, "/create/publisher");
    expect(navigate).toHaveBeenNthCalledWith(2, { button: 0 }, "/create/series");
    expect(navigate).toHaveBeenNthCalledWith(3, { button: 0 }, "/create/issue/selected-path");
  });

  it("shows variant copy action on issue level", () => {
    const navigate = jest.fn();
    const instance = new (AddFab as any)({
      session: { loggedIn: true },
      level: "ISSUE",
      us: false,
      selected: {
        issue: {
          number: "1",
          format: "Heft",
          variant: "A",
          series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel" } },
        },
      },
      navigate,
    });
    instance.setState = (updater: any) => {
      const next = typeof updater === "function" ? updater(instance.state) : updater;
      instance.state = { ...instance.state, ...next };
    };

    const tree = instance.render();
    let variantAction: ((event?: unknown) => void) | undefined;
    walkElements(tree, (element) => {
      if (element.props?.tooltipTitle === "Variant" && typeof element.props?.onClick === "function")
        variantAction = element.props.onClick;
    });

    expect(typeof variantAction).toBe("function");
    variantAction?.({ button: 0 });
    expect(navigate).toHaveBeenCalledWith({ button: 0 }, "/copy/issue/selected-path");
  });

  it("computes mobile bottom offset based on bottom action bar visibility", () => {
    const instance = new (AddFab as any)({
      session: { loggedIn: true },
    });

    expect(getSpeedDialBottomSx(instance)).toBe("calc(16px + 88px + env(safe-area-inset-bottom))");

    instance.setState = (updater: any) => {
      const next = typeof updater === "function" ? updater(instance.state) : updater;
      instance.state = { ...instance.state, ...next };
    };

    instance.setState({ mobileBottomBarHeight: 88 });
    expect(getSpeedDialBottomSx(instance)).toBe("calc(16px + 112px)");

    instance.setState({ mobileBottomBarHeight: 0 });
    expect(getSpeedDialBottomSx(instance)).toBe("calc(16px + env(safe-area-inset-bottom))");
  });
});
