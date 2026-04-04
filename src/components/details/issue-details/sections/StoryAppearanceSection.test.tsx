/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoryAppearanceSection } from "./StoryAppearanceSection";

const appearanceListMock = jest.fn<
  React.ReactElement,
  [{ label: string; type: string; appRole?: string; hideIfEmpty?: boolean; us?: boolean }]
>(({ label }) => <div>{label}</div>);

jest.mock("../contains/AppearanceList", () => ({
  AppearanceList: (props: {
    label: string;
    type: string;
    appRole?: string;
    hideIfEmpty?: boolean;
    us?: boolean;
  }) => appearanceListMock(props),
}));

describe("StoryAppearanceSection", () => {
  beforeEach(() => {
    appearanceListMock.mockClear();
  });

  it("renders nothing when neither item nor parent provides appearances", () => {
    const { container } = render(<StoryAppearanceSection item={{ appearances: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("uses parent appearances as the gate and expands on demand", async () => {
    const user = userEvent.setup();

    render(
      <StoryAppearanceSection
        us={true}
        item={{
          appearances: [],
          parent: {
            appearances: [{ name: "Spider-Man", type: "CHARACTER" }],
          },
        }}
      />
    );

    expect(screen.getByText("Auftritte")).toBeInTheDocument();
    expect(screen.getByText("Hauptcharaktere")).not.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Auftritte ausklappen" }));

    expect(screen.getByText("Hauptcharaktere")).toBeInTheDocument();
    expect(screen.getByText("Antagonisten")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Rassen")).toBeInTheDocument();
    expect(screen.getByText("Tiere")).toBeInTheDocument();
    expect(screen.getByText("Gegenstände")).toBeInTheDocument();
    expect(screen.getByText("Fahrzeuge")).toBeInTheDocument();
    expect(screen.getByText("Orte")).toBeInTheDocument();

    expect(appearanceListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Hauptcharaktere",
        type: "CHARACTER",
        appRole: "FEATURED",
        hideIfEmpty: true,
        us: true,
      })
    );
    expect(screen.getByText("Hauptcharaktere")).toBeVisible();
  });
});
