import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { toChipList } from "./toChipList";

describe("toChipList", () => {
  it("renders unknown chip when list is empty", () => {
    const html = renderToStaticMarkup(toChipList([], {}, "WRITER"));
    expect(html).toContain("Unbekannt");
  });

  it("builds appearance filter navigation payload on chip click", () => {
    const navigate = vi.fn();
    const element = toChipList(
      [{ __typename: "Appearance", name: "Spider-Man" }],
      { us: false, navigate },
      "HERO"
    ) as React.ReactElement<{ children: React.ReactNode }>;

    const chips = React.Children.toArray(element.props.children) as React.ReactElement[];
    const chip = chips[0];
    chip.props.onClick?.({ type: "click" });

    expect(navigate).toHaveBeenCalledTimes(1);
    const [, path, query] = navigate.mock.calls[0];
    expect(path).toBe("/de");
    expect(query).toEqual({
      filter: JSON.stringify({
        us: false,
        appearances: [{ name: "Spider-Man" }],
      }),
    });
  });

  it("builds arc and individual filter payloads", () => {
    const navigate = vi.fn();

    const arcElement = toChipList(
      [{ __typename: "Arc", title: "Maximum Carnage" }],
      { us: true, navigate },
      "HERO"
    ) as React.ReactElement<{ children: React.ReactNode }>;
    const arcChip = React.Children.toArray(arcElement.props.children)[0] as React.ReactElement;
    arcChip.props.onClick?.({ type: "click" });

    expect(navigate.mock.calls[0][1]).toBe("/us");
    expect(navigate.mock.calls[0][2]).toEqual({
      filter: JSON.stringify({
        us: true,
        arcs: [{ title: "Maximum Carnage" }],
      }),
    });

    navigate.mockClear();

    const individualElement = toChipList(
      [{ __typename: "Individual", name: "Peter Parker" }],
      { us: true, navigate },
      "WRITER"
    ) as React.ReactElement<{ children: React.ReactNode }>;
    const individualChip = React.Children.toArray(
      individualElement.props.children
    )[0] as React.ReactElement;
    individualChip.props.onClick?.({ type: "click" });

    expect(navigate.mock.calls[0][2]).toEqual({
      filter: JSON.stringify({
        us: true,
        individuals: [{ name: "Peter Parker", type: "WRITER" }],
      }),
    });
  });
});
