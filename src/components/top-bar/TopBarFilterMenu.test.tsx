import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TopBarFilterMenu from "./TopBarFilterMenu";

vi.mock("@apollo/client", () => ({
  gql: (value: TemplateStringsArray) => value.join(""),
  useQuery: () => ({ data: { filterCount: 42 }, loading: false }),
}));

vi.mock("./ExportDialog", () => ({
  default: function MockExportDialog(props: { open?: boolean }) {
    return props.open ? <div data-testid="export-dialog-open">Export dialog open</div> : null;
  },
}));

describe("TopBarFilterMenu", () => {
  it("renders active filter button for logged-out users", () => {
    render(
      <TopBarFilterMenu us={false} selected={{ us: false }} navigate={vi.fn()} session={null} />
    );

    const button = screen.getByRole("button", { name: "Filter öffnen" });
    expect(button.hasAttribute("disabled")).toBe(false);
  });

  it("navigates to filter page for logged-out users", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(
      <TopBarFilterMenu us={false} selected={{ us: false }} navigate={navigate} session={null} />
    );

    await user.click(screen.getByRole("button", { name: "Filter öffnen" }));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][1]).toBe("/filter/de");
  });

  it("opens menu for active filters and supports edit/reset/export actions for logged-in users", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const selected = {
      us: true,
      publisher: { name: "Marvel" },
    };

    render(
      <TopBarFilterMenu
        us={true}
        selected={selected as never}
        isFilterActive={true}
        query={{ filter: JSON.stringify({ onlyCollected: true, us: true }) }}
        session={{ loggedIn: true }}
        navigate={navigate}
      />
    );

    expect(screen.getByText("42")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Filteroptionen" }));
    await user.click(await screen.findByRole("menuitem", { name: "Bearbeiten" }));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate.mock.calls[0][1]).toBe("/filter/us");

    await user.click(screen.getByRole("button", { name: "Filteroptionen" }));
    await user.click(await screen.findByRole("menuitem", { name: "Zurücksetzen" }));

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate.mock.calls[1][1]).toBe("/us/Marvel");
    expect(navigate.mock.calls[1][2]).toEqual({ filter: null });

    await user.click(screen.getByRole("button", { name: "Filteroptionen" }));
    await user.click(await screen.findByRole("menuitem", { name: "Exportieren" }));

    expect(screen.getByTestId("export-dialog-open")).toBeTruthy();
  });
});
