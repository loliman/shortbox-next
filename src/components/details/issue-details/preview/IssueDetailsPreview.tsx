import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import Box from "@mui/material/Box";

export function IssueDetailsPreview() {
  const desktopColumnSx = {
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  } as const;

  return (
    <Box sx={{ width: "100%", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <CardHeader
        title={
          <Box sx={{ width: "100%" }}>
            <Skeleton variant="text" width="48%" height={34} />
            <Skeleton variant="text" width="28%" height={24} />
          </Box>
        }
      />

      <CardContent
        sx={{
          pt: 1,
          pb: 0,
          "&:last-child": {
            pb: 0,
          },
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            display: { xs: "flex", lg: "none" },
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={62} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ width: "100%", maxWidth: "min(100%, 480px)", mx: "auto", mb: 2 }}>
              <Box sx={{ position: "relative", width: "100%", pt: "150%" }}>
                <Skeleton
                  variant="rectangular"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                  }}
                />
              </Box>
            </Box>

            <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={56} />
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: "none", lg: "grid" },
            gridTemplateColumns: "minmax(0, 1fr) clamp(230px, 26vw, 345px)",
            gap: 2,
            alignItems: "stretch",
            width: "100%",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box sx={desktopColumnSx}>
            <Box sx={{ minWidth: 0 }}>
              <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={62} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={62} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={56} />
            </Box>
          </Box>

          <Box sx={desktopColumnSx}>
            <Box sx={{ position: "relative", width: "100%", pt: "150%" }}>
              <Skeleton
                variant="rectangular"
                sx={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0 }}>
              <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={56} sx={{ mb: 1 }} />
              <Skeleton variant="rounded" width="100%" height={56} />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Box>
  );
}
