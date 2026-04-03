/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "./TopBar";

jest.mock("./SearchBar", () => ({
  __esModule: true,
  default: function MockSearchBar(
    props: Readonly<{ onFocus?: (e: { preventDefault: () => void }, focus: boolean) => void }>
  ) {
    return (
      <button
        type="button"
        data-testid="searchbar-mock"
        onClick={() => props.onFocus?.({ preventDefault: jest.fn() }, true)}
      >
        SearchBar
      </button>
    );
  },
}));

jest.mock("./TopBarFilterMenu", () => ({
  __esModule: true,
  default: function MockTopBarFilterMenu() {
    return <div data-testid="filter-menu-mock">FilterMenu</div>;
  },
}));

describe("TopBar", () => {
  it("navigates to current locale home via logo button", async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    const resetNavigationState = jest.fn();

    render(
      <TopBar
        us={true}
        selected={{ us: true }}
        navigate={navigate}
        resetNavigationState={resetNavigationState}
      />
    );

    await user.click(screen.getByRole("link", { name: "Zur Startseite" }));

    expect(resetNavigationState).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][1]).toBe("/us");
  });

  it("toggles locale switch and resets filter query", async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    const resetNavigationState = jest.fn();

    render(
      <TopBar
        us={true}
        selected={{ us: true }}
        navigate={navigate}
        resetNavigationState={resetNavigationState}
      />
    );

    await user.click(screen.getByRole("switch"));

    expect(resetNavigationState).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][1]).toBe("/de");
    expect(navigate.mock.calls[0][2]).toEqual({ filter: null });
  });

  it("keeps logo visible in phone portrait on non-root levels", () => {
    render(
      <TopBar
        us={false}
        isPhone={true}
        isPhonePortrait={true}
        selected={{
          us: false,
          issue: {
            number: "1",
            series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel", us: false } },
          },
        }}
      />
    );

    expect(screen.getByRole("link", { name: "Zur Startseite" })).toBeTruthy();
  });

  it("calls drawer toggle and keeps searchbar centered container mounted", async () => {
    const user = userEvent.setup();
    const toggleDrawer = jest.fn();

    render(<TopBar toggleDrawer={toggleDrawer} navigate={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "Navigation umschalten" }));
    expect(toggleDrawer).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("topbar-search-center")).toBeTruthy();
  });

  it("toggles theme mode through theme button", async () => {
    const user = userEvent.setup();
    const toggleTheme = jest.fn();

    render(<TopBar themeMode="light" toggleTheme={toggleTheme} navigate={jest.fn()} />);

    await user.click(screen.getByRole("button", { name: "Darkmode aktivieren" }));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it("uses icon-only search on mobile and expands full-width search on click", async () => {
    const user = userEvent.setup();

    render(<TopBar isPhone={true} isPhonePortrait={true} navigate={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Suche öffnen" })).toBeTruthy();
    expect(screen.queryByTestId("searchbar-mock")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Suche öffnen" }));

    expect(screen.getByTestId("searchbar-mock")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Suche schließen" })).toBeTruthy();
  });
});
