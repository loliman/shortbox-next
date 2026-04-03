/** @jest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";

const sortContainerMock = jest.fn();

jest.mock("../SortContainer", () => ({
  __esModule: true,
  default: (props: unknown) => {
    sortContainerMock(props);
    return <div data-testid="sort-container" />;
  },
}));

jest.mock("../filter/FilterSummaryBar", () => ({
  __esModule: true,
  default: () => null,
}));

import ListingToolbar from "./ListingToolbar";

describe("ListingToolbar", () => {
  beforeEach(() => {
    sortContainerMock.mockReset();
  });

  it("should_pass_compact_layout_to_sort_container_when_compact_toolbar_is_rendered", () => {
    render(<ListingToolbar compactLayout={true} showSort={true} />);

    expect(screen.getByTestId("sort-container")).toBeTruthy();
    expect(sortContainerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        compactLayout: true,
      })
    );
  });
});
