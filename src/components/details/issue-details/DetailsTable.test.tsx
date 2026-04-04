/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { DetailsTable } from "./DetailsTable";

describe("DetailsTable", () => {
  it("renders the provided details slot component inside the table body", () => {
    const DetailsComponent = jest.fn(() => (
      <>
        <tr>
          <td>Status</td>
          <td>Aktiv</td>
        </tr>
        <tr>
          <td>Format</td>
          <td>Hardcover</td>
        </tr>
      </>
    ));

    const issue = { id: 42 };

    render(<DetailsTable details={DetailsComponent} issue={issue} marker="test-marker" />);

    expect(DetailsComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        issue,
        marker: "test-marker",
        details: DetailsComponent,
      }),
      undefined
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Aktiv")).toBeInTheDocument();
    expect(screen.getByText("Format")).toBeInTheDocument();
    expect(screen.getByText("Hardcover")).toBeInTheDocument();
  });
});
