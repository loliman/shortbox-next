import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

interface AppPageLoaderProps {
  label?: string;
}

export function AppPageLoader(props: Readonly<AppPageLoaderProps>) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 2,
        backgroundColor: "background.default",
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 640,
          p: { xs: 3, sm: 4 },
          position: "relative",
          overflow: "hidden",
          borderRadius: 4,
          border: 1,
          borderColor: "divider",
          boxShadow: 6,
          backgroundColor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
          {/* Header Skeleton */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Skeleton variant="text" width="55%" height={32} />
              <Skeleton variant="circular" width={28} height={28} />
            </Box>
            <Skeleton variant="text" width="30%" height={20} />
          </Box>

          <Divider />

          {/* Details Body Mock Layout */}
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column-reverse", sm: "row" },
              gap: 4,
              alignItems: "stretch",
            }}
          >
            {/* Attributes column */}
            <Stack spacing={2.5} sx={{ flex: 1 }}>
              {Array.from({ length: 4 }).map((_, idx) => (
                <Box key={idx} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="45%" height={20} />
                </Box>
              ))}
            </Stack>

            {/* Cover image placeholder on the right */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Skeleton
                variant="rectangular"
                width={150}
                height={220}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          </Box>

          {/* User informational prompt at the bottom */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, opacity: 0.65 }}>
            <Skeleton variant="circular" width={18} height={18} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {props.label || "Bereite Shortbox-Auswahl vor..."}
            </Typography>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

export default AppPageLoader;
