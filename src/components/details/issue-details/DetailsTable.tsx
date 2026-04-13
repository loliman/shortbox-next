import React from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import type { IssueDetailsSlotComponent } from "./slotTypes";

interface DetailsTableProps {
  details: IssueDetailsSlotComponent;
  issue: unknown;
  framed?: boolean;
  [key: string]: unknown;
}

export function DetailsTable(props: Readonly<DetailsTableProps>) {
  const DetailsComponent = props.details;
  const framed = props.framed ?? true;
  const table = (
    <Table
      size="small"
      sx={{
        "& .MuiTableCell-root": {
          px: 1.5,
          py: 0.9,
        },
        "& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root": {
          borderBottom: 0,
        },
      }}
    >
      <TableBody>
        <DetailsComponent {...props} issue={props.issue} />
      </TableBody>
    </Table>
  );

  if (!framed) return table;

  return (
    <Paper variant="outlined" sx={{ width: "100%", boxShadow: 1 }}>
      {table}
    </Paper>
  );
}
