import React from "react";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

export function TypeListEntryPlaceholder() {
  return (
    <ListItem sx={{ py: 1.25, px: 2 }}>
      <Box sx={{ width: "100%" }}>
        <Skeleton variant="text" width="74%" height={26} />
      </Box>
    </ListItem>
  );
}

export function NoEntries() {
  return (
    <Box sx={{ p: 2, display: "flex" }}>
      <Typography sx={{ alignSelf: "center" }}>Keine Einträge gefunden</Typography>
    </Box>
  );
}
