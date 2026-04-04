/** @jest-environment jsdom */
import React from "react";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import { DetailsRow } from "./DetailsRow";

describe("DetailsRow", () => {
  it("renders the label and value in separate table cells", () => {
    render(
      <Table>
        <TableBody>
          <DetailsRow label="Verlag" value={<span>Panini</span>} />
        </TableBody>
      </Table>
    );

    const row = screen.getByRole("row");
    const cells = within(row).getAllByRole("cell");

    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveTextContent("Verlag");
    expect(cells[1]).toHaveTextContent("Panini");
  });
});
