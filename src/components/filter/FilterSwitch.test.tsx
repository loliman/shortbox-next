/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterSwitch from "./FilterSwitch";

describe("FilterSwitch", () => {
  it("toggles switch through user click", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();

    render(<FilterSwitch checked={false} label="Exklusiv" onToggle={onToggle} />);

    await user.click(screen.getByRole("checkbox", { name: "Exklusiv" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
