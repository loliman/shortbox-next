/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ContributorsSection from "./ContributorsSection";
import type { FilterValues } from "../types";

const autocompleteBaseMock = jest.fn<
  React.ReactElement,
  [{ label: string; value?: unknown[]; placeholder?: string; noOptionsText?: string }]
>(({ label, value }) => (
  <div>
    <span>{label}</span>
    <span>{Array.isArray(value) ? value.length : 0}</span>
  </div>
));

jest.mock("../../generic/AutocompleteBase", () => ({
  __esModule: true,
  default: (props: {
    label: string;
    value?: unknown[];
    placeholder?: string;
    noOptionsText?: string;
  }) => autocompleteBaseMock(props),
}));

jest.mock("../../generic/useAutocompleteQuery", () => ({
  useAutocompleteQuery: () => ({
    options: [],
    loading: false,
    isBelowMinLength: true,
    error: null,
    onListboxScroll: undefined,
  }),
}));

function createEmptyFilterValues(overrides?: Partial<FilterValues>): FilterValues {
  return {
    formats: [],
    withVariants: false,
    releasedateFrom: "",
    releasedateTo: "",
    releasedateExact: "",
    publishers: [],
    series: [],
    genres: [],
    numberFrom: "",
    numberTo: "",
    numberExact: "",
    numberVariant: "",
    arcs: [],
    individuals: [],
    appearances: [],
    realities: [],
    firstPrint: false,
    notFirstPrint: false,
    onlyPrint: false,
    notOnlyPrint: false,
    onlyTb: false,
    notOnlyTb: false,
    exclusive: false,
    notExclusive: false,
    reprint: false,
    notReprint: false,
    otherOnlyTb: false,
    notOtherOnlyTb: false,
    onlyOnePrint: false,
    notOnlyOnePrint: false,
    noPrint: false,
    notNoPrint: false,
    onlyCollected: false,
    onlyNotCollected: false,
    onlyNotCollectedNoOwnedVariants: false,
    noComicguideId: false,
    noContent: false,
    ...overrides,
  };
}

describe("ContributorsSection", () => {
  beforeEach(() => {
    autocompleteBaseMock.mockClear();
  });

  it("renders translator autocomplete for DE filters and hides it for US filters", () => {
    const baseProps = {
      values: createEmptyFilterValues(),
      setFieldValue: jest.fn(),
    };

    const { rerender } = render(<ContributorsSection {...baseProps} us={false} />);

    expect(screen.getByText("Mitwirkende")).toBeInTheDocument();
    expect(screen.getByText("Autor")).toBeInTheDocument();
    expect(screen.getByText("Zeichner")).toBeInTheDocument();
    expect(screen.getByText("Übersetzer")).toBeInTheDocument();

    rerender(<ContributorsSection {...baseProps} us={true} />);

    expect(screen.queryByText("Übersetzer")).not.toBeInTheDocument();
  });

  it("passes only matching selected contributor values into each autocomplete", () => {
    render(
      <ContributorsSection
        us={false}
        setFieldValue={jest.fn()}
        values={createEmptyFilterValues({
          individuals: [
            { name: "Stan Lee", type: "WRITER" },
            { name: "Marie Javins", role: "EDITOR" },
            { name: "Panini Search", type: "WRITER", pattern: true },
            { name: "Petra Bolte", type: ["TRANSLATOR"] },
          ],
        })}
      />
    );

    expect(autocompleteBaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Autor",
        value: [expect.objectContaining({ name: "Stan Lee" })],
      })
    );
    expect(autocompleteBaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Editor",
        value: [expect.objectContaining({ name: "Marie Javins" })],
      })
    );
    expect(autocompleteBaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: "Übersetzer",
        value: [expect.objectContaining({ name: "Petra Bolte" })],
      })
    );
  });
});
