import React from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";

interface DetailsTableProps {
  details: React.ReactElement;
  issue: unknown;
  [key: string]: unknown;
}

export function DetailsTable(props: Readonly<DetailsTableProps>) {
  return (
    <Paper variant="outlined" sx={{ width: "100%", boxShadow: 1 }}>
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
          {React.cloneElement(props.details as React.ReactElement<any>, {
            ...props,
            issue: props.issue,
          })}
        </TableBody>
      </Table>
    </Paper>
  );
}
