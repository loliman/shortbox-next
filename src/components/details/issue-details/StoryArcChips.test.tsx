/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StoryArcChips } from "./StoryArcChips";

const push = jest.fn();

jest.mock("../../generic/usePendingNavigation", () => ({
  usePendingNavigation: () => ({
    push,
  }),
}));

describe("StoryArcChips", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders nothing when no titled arcs are present", () => {
    const { container } = render(<StoryArcChips arcs={[{ title: "" }, { title: null }, {}]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders labeled arc chips and navigates with the DE locale", async () => {
    const user = userEvent.setup();

    render(
      <StoryArcChips
        arcs={[
          { title: "Acts of Vengeance", type: "EVENT" },
          { title: "Maximum Carnage", type: "STORYLINE" },
          { title: "Inferno", type: "OTHER" },
        ]}
      />
    );

    expect(screen.getByRole("button", { name: "Acts of Vengeance (Event)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maximum Carnage (Story Line)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inferno (Story Arc)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Maximum Carnage (Story Line)" }));

    expect(push).toHaveBeenCalledWith("/de/arc/maximum-carnage");
  });

  it("uses the US locale when requested", async () => {
    const user = userEvent.setup();

    render(<StoryArcChips arcs={[{ title: "Civil War", type: "EVENT" }]} us={true} />);

    await user.click(screen.getByRole("button", { name: "Civil War (Event)" }));

    expect(push).toHaveBeenCalledWith("/us/arc/civil-war");
  });
});
