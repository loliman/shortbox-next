/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoryPeopleSection } from "./StoryPeopleSection";

const individualListMock = jest.fn<
  React.ReactElement,
  [{ label: string; type: string; hideIfEmpty?: boolean; us?: boolean }]
>(({ label }) => <div>{label}</div>);

jest.mock("../contains/IndividualList", () => ({
  IndividualList: (props: { label: string; type: string; hideIfEmpty?: boolean; us?: boolean }) =>
    individualListMock(props),
}));

describe("StoryPeopleSection", () => {
  beforeEach(() => {
    individualListMock.mockClear();
  });

  it("renders the expected contributor groups and hides translators when requested", () => {
    render(<StoryPeopleSection item={{}} us={false} includeTranslator={false} />);

    expect(screen.getByText("Mitwirkende")).toBeInTheDocument();
    expect(screen.getByText("Autor")).toBeInTheDocument();
    expect(screen.getByText("Zeichner")).toBeInTheDocument();
    expect(screen.getByText("Inker")).toBeInTheDocument();
    expect(screen.getByText("Kolorist")).toBeInTheDocument();
    expect(screen.getByText("Letterer")).toBeInTheDocument();
    expect(screen.getByText("Verleger")).toBeInTheDocument();
    expect(screen.queryByText("Übersetzer")).not.toBeInTheDocument();

    expect(individualListMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ label: "Übersetzer" })
    );
  });

  it("passes hideIfEmpty to translators when they are optional and toggles collapsed state", async () => {
    const user = userEvent.setup();

    render(<StoryPeopleSection item={{}} us={true} translatorOptional={true} />);

    expect(individualListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Übersetzer",
        type: "TRANSLATOR",
        hideIfEmpty: true,
        us: true,
      })
    );

    const toggleButton = screen.getByRole("button", { name: "Mitwirkende einklappen" });
    await user.click(toggleButton);

    expect(screen.getByRole("button", { name: "Mitwirkende ausklappen" })).toBeInTheDocument();
  });
});
