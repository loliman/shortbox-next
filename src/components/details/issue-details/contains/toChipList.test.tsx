import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { toChipList } from "./toChipList";

type ClickableChipElement = React.ReactElement<{ onClick?: () => void }>;

describe("toChipList", () => {
  it("renders unknown chip when list is empty", () => {
    const html = renderToStaticMarkup(toChipList([], {}, "WRITER"));
    expect(html).toContain("Unbekannt");
  });

  it("builds appearance filter navigation payload on chip click", () => {
    const navigate = jest.fn();
    const element = toChipList(
      [{ __typename: "Appearance", name: "Spider-Man" }],
      { us: false, navigate },
      "HERO"
    ) as React.ReactElement<{ children: React.ReactNode }>;

    const chips = React.Children.toArray(element.props.children) as ClickableChipElement[];
    const chip = chips[0];
    chip.props.onClick?.();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toBe("/de/appearance/spider-man");
  });

  it("builds arc and individual filter payloads", () => {
    const navigate = jest.fn();

    const arcElement = toChipList(
      [{ __typename: "Arc", title: "Maximum Carnage" }],
      { us: true, navigate },
      "HERO"
    ) as React.ReactElement<{ children: React.ReactNode }>;
    const arcChip = React.Children.toArray(arcElement.props.children)[0] as ClickableChipElement;
    arcChip.props.onClick?.();

    expect(navigate.mock.calls[0][0]).toBe("/us/arc/maximum-carnage");

    navigate.mockClear();

    const individualElement = toChipList(
      [{ __typename: "Individual", name: "Peter Parker" }],
      { us: true, navigate },
      "WRITER"
    ) as React.ReactElement<{ children: React.ReactNode }>;
    const individualChip = React.Children.toArray(
      individualElement.props.children
    )[0] as ClickableChipElement;
    individualChip.props.onClick?.();

    expect(navigate.mock.calls[0][0]).toBe("/us/person/peter-parker");
  });

  it("routes appearance-like entries without __typename to appearance landing", () => {
    const navigate = jest.fn();
    const element = toChipList([{ name: "Spider-Man", type: "CHARACTER" }], { us: false, navigate }, "CHARACTER") as React.ReactElement<{
      children: React.ReactNode;
    }>;

    const chip = React.Children.toArray(element.props.children)[0] as ClickableChipElement;
    chip.props.onClick?.();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toBe("/de/appearance/spider-man");
  });

  it("keeps individual fallback for creator-like entries without __typename", () => {
    const navigate = jest.fn();
    const element = toChipList([{ name: "Stan Lee", type: "WRITER" }], { us: false, navigate }, "WRITER") as React.ReactElement<{
      children: React.ReactNode;
    }>;

    const chip = React.Children.toArray(element.props.children)[0] as ClickableChipElement;
    chip.props.onClick?.();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][0]).toBe("/de/person/stan-lee");
  });
});
