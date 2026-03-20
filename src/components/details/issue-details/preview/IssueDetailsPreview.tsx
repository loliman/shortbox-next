import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";

export function IssueDetailsPreview() {
  const coverWidth = {
    xs: "100%",
    md: "clamp(320px, 36vw, 480px)",
  };
  const gridTemplateColumns = { xs: "1fr", md: "minmax(0, 1fr) clamp(320px, 36vw, 480px)" };

  return (
    <React.Fragment>
      <CardHeader
        title={
          <Box sx={{ width: "100%" }}>
            <Skeleton variant="text" width="48%" height={34} />
            <Skeleton variant="text" width="28%" height={24} />
          </Box>
        }
      />

      <CardContent>
        <Box sx={{ pb: 1.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Skeleton variant="rounded" width={140} height={28} />
          <Skeleton variant="rounded" width={180} height={28} />
          <Skeleton variant="rounded" width={120} height={28} />
        </Box>

        <Box sx={{ pb: 5 }}>
          <Skeleton variant="rounded" width="100%" height={48} />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns,
            gap: 2,
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ width: coverWidth, maxWidth: "100%", mb: 2 }}>
              <Skeleton
                variant="rectangular"
                width="100%"
                sx={{
                  aspectRatio: "2 / 3",
                  minHeight: { xs: 648, sm: 756, md: 648, lg: 756 },
                }}
              />
            </Box>

            <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={56} />
          </Box>
        </Box>
      </CardContent>
    </React.Fragment>
  );
}
