import React from "react";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";

interface DetailsRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
}

export function DetailsRow(props: Readonly<DetailsRowProps>) {
  return (
    <TableRow className="row">
      <TableCell
        className="label"
        align="left"
        sx={{
          width: "38%",
          fontWeight: 500,
          verticalAlign: "top",
        }}
      >
        {props.label}
      </TableCell>
      <TableCell className="value" align="left" sx={{ width: "62%" }}>
        {props.value}
      </TableCell>
    </TableRow>
  );
}
