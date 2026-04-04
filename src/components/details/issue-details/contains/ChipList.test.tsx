/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ChipList } from "./ChipList";

describe("ChipList", () => {
  it("renders the label, filters by requested type/role, and de-duplicates items by visible name", () => {
    render(
      <ChipList
        label="Figuren"
        type="CHARACTER"
        appRole="FEATURED"
        items={[
          { name: "Spider-Man", type: "CHARACTER", role: "FEATURED" },
          { name: "spider-man", type: "CHARACTER", role: "HERO" },
          { name: "Mary Jane", type: "CHARACTER", role: "SUPPORTING" },
          { name: "Daily Bugle", type: "LOCATION", role: "FEATURED" },
        ]}
      />
    );

    expect(screen.getByText("Figuren")).toBeInTheDocument();
    expect(screen.getAllByText("Spider-Man")).toHaveLength(1);
    expect(screen.queryByText("Mary Jane")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily Bugle")).not.toBeInTheDocument();
  });

  it("supports legacy character role encoding in the type field", () => {
    render(
      <ChipList
        type="CHARACTER"
        appRole="ANTAGONIST"
        items={[
          { name: "Green Goblin", type: "VILLAIN" },
          { name: "Doctor Octopus", type: "ANTAGONIST" },
          { name: "Spider-Man", type: "FEATURED" },
        ]}
      />
    );

    expect(screen.getByText("Green Goblin")).toBeInTheDocument();
    expect(screen.getByText("Doctor Octopus")).toBeInTheDocument();
    expect(screen.queryByText("Spider-Man")).not.toBeInTheDocument();
  });

  it("returns nothing when hideIfEmpty is enabled and no filtered items remain", () => {
    const { container } = render(
      <ChipList
        hideIfEmpty={true}
        type="WRITER"
        items={[{ name: "Spider-Man", type: "CHARACTER" }]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("uses individual mode as a strict type filter", () => {
    render(
      <ChipList
        individual={true}
        type="WRITER"
        items={[
          { name: "Stan Lee", type: "WRITER" },
          { name: "Jack Kirby", type: "PENCILLER" },
        ]}
      />
    );

    expect(screen.getByText("Stan Lee")).toBeInTheDocument();
    expect(screen.queryByText("Jack Kirby")).not.toBeInTheDocument();
  });
});
