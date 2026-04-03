/** @jest-environment jsdom */
import React from "react";
import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { search } from "../../graphql/queriesTyped";
import { SearchBar, getNodeType } from "./SearchBar";

describe("SearchBar", () => {
  it("maps node type labels", () => {
    expect(getNodeType("publisher")).toBe("Verlag");
    expect(getNodeType("series")).toBe("Serie");
    expect(getNodeType("issue")).toBe("Ausgabe");
    expect(getNodeType(undefined)).toBe("Ausgabe");
  });

  it("searches with debounce and navigates to selected result", async () => {
    const user = userEvent.setup();
    const navigate = jest.fn();
    const onFocus = jest.fn();

    const mocks = [
      {
        request: {
          query: search,
          variables: { pattern: "sp", us: false },
        },
        result: {
          data: {
            nodes: [
              {
                __typename: "Node",
                type: "issue",
                label: "Spider-Man #1",
                url: "/de/Marvel/Spider-Man_Vol_1/1",
              },
            ],
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={mocks}>
        <SearchBar us={false} navigate={navigate} onFocus={onFocus} />
      </MockedProvider>
    );

    const input = screen.getByRole("combobox", { name: "Suche" });
    await user.click(input);
    await user.type(input, "sp");

    const option = await screen.findByRole("option", { name: /Spider-Man #1/i }, { timeout: 3000 });
    await user.click(option);

    expect(navigate).toHaveBeenCalledWith(null, "/de/Marvel/Spider-Man_Vol_1/1");
    expect(onFocus).toHaveBeenCalled();
    expect(onFocus.mock.calls[onFocus.mock.calls.length - 1]).toEqual([null, false]);
  });

  it("shows error text when the query fails", async () => {
    const user = userEvent.setup();

    const mocks = [
      {
        request: {
          query: search,
          variables: { pattern: "er", us: true },
        },
        error: new Error("network down"),
      },
    ];

    render(
      <MockedProvider mocks={mocks}>
        <SearchBar us={true} />
      </MockedProvider>
    );

    const input = screen.getByRole("combobox", { name: "Suche" });
    await user.click(input);
    await user.type(input, "er");

    expect(await screen.findByText("Fehler!", {}, { timeout: 3000 })).toBeTruthy();
  });
});
