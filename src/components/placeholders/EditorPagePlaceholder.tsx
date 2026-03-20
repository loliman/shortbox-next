import React from "react";
import Box from "@mui/material/Box";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function EditorPagePlaceholder() {
  return (
    <React.Fragment>
      <CardHeader
        title={
          <Box sx={{ width: "100%" }}>
            <Skeleton variant="text" width="40%" height={34} />
            <Skeleton variant="text" width="26%" height={22} />
          </Box>
        }
      />

      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Skeleton variant="rounded" width="100%" height={56} />
          <Skeleton variant="rounded" width="100%" height={56} />
          <Skeleton variant="rounded" width="100%" height={56} />
          <Skeleton variant="rounded" width="100%" height={56} />
          <Box sx={{ display: "flex", gap: 1.25, mt: 0.5 }}>
            <Skeleton variant="rounded" width={132} height={40} />
            <Skeleton variant="rounded" width={132} height={40} />
          </Box>
        </Stack>
      </CardContent>
    </React.Fragment>
  );
}
