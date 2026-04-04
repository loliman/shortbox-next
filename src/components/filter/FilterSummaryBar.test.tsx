/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterSummaryBar from "./FilterSummaryBar";
import type { SelectedRoot } from "../../types/domain";

const push = jest.fn();
const generateSeoUrl = jest.fn(() => "/generated-selected-route");
const buildRouteHref = jest.fn(() => "/filter/de?from=%2Fgenerated-selected-route");

jest.mock("../../lib/routes/hierarchy", () => ({
  generateSeoUrl: (...args: unknown[]) => generateSeoUrl(...args),
}));

jest.mock("../generic/routeHref", () => ({
  buildRouteHref: (...args: unknown[]) => buildRouteHref(...args),
}));

jest.mock("../generic/usePendingNavigation", () => ({
  usePendingNavigation: () => ({
    isPending: false,
    push,
  }),
}));

describe("FilterSummaryBar", () => {
  beforeEach(() => {
    push.mockClear();
    generateSeoUrl.mockClear();
    buildRouteHref.mockClear();
  });

  it("renders nothing when no active filter can be parsed", () => {
    const { container: invalidContainer } = render(
      <FilterSummaryBar query={{ filter: "{not-json" }} us={false} />
    );
    const { container: emptyContainer } = render(
      <FilterSummaryBar query={{ filter: null }} us={false} />
    );

    expect(invalidContainer).toBeEmptyDOMElement();
    expect(emptyContainer).toBeEmptyDOMElement();
  });

  it("shows visible filter chips, collapses overflow, and uses selected route for edit/reset actions", async () => {
    const user = userEvent.setup();
    const selected = {
      publisher: { name: "Panini", us: false },
      series: {
        title: "Marvel Horror Classic Collection",
        volume: 1,
        publisher: { name: "Panini", us: false },
      },
    } as SelectedRoot;
    const filter = JSON.stringify({
      formats: [{ name: "Hardcover" }],
      releasedates: [{ compare: ">=", date: "2026-01-01" }],
      withVariants: true,
      publishers: [{ name: "Panini" }],
      series: [{ title: "Marvel Horror Classic Collection" }],
      numbers: [{ compare: "=", number: "1" }],
      arcs: [{ title: "Maximum Carnage" }],
      individuals: [{ name: "Stan Lee", type: "WRITER" }],
      appearances: [{ name: "Spider-Man" }],
      onlyCollected: true,
    });

    render(<FilterSummaryBar query={{ filter }} us={false} selected={selected} />);

    expect(screen.getByText("Filter aktiv")).toBeInTheDocument();
    expect(screen.getByText("Format: Hardcover")).toBeInTheDocument();
    expect(screen.getByText("Erscheinungsdatum von: 2026-01-01")).toBeInTheDocument();
    expect(screen.getByText("Mit Varianten")).toBeInTheDocument();
    expect(screen.getByText("Verlag: Panini")).toBeInTheDocument();
    expect(screen.getByText("Serie: Marvel Horror Classic Collection")).toBeInTheDocument();
    expect(screen.getByText("Exakte Nummer(n): 1")).toBeInTheDocument();
    expect(screen.getByText("Teil von: Maximum Carnage")).toBeInTheDocument();
    expect(screen.getByText("+2 weitere")).toBeInTheDocument();
    expect(screen.queryByText("Auftritte: Spider-Man")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bearbeiten" }));

    expect(generateSeoUrl).toHaveBeenCalledWith(selected, false);
    expect(buildRouteHref).toHaveBeenCalledWith(
      "/filter/de",
      { filter },
      {
        filter,
        from: "/generated-selected-route",
      }
    );
    expect(push).toHaveBeenCalledWith("/filter/de?from=%2Fgenerated-selected-route");

    push.mockClear();

    await user.click(screen.getByRole("button", { name: "Zurücksetzen" }));

    expect(push).toHaveBeenCalledWith("/generated-selected-route");
  });

  it("resets to the locale root when no selected root exists", async () => {
    const user = userEvent.setup();
    const filter = JSON.stringify({ onlyCollected: true });

    render(<FilterSummaryBar query={{ filter }} us={true} selected={{ us: true }} />);

    await user.click(screen.getByRole("button", { name: "Zurücksetzen" }));

    expect(push).toHaveBeenCalledWith("/us");
  });
});
