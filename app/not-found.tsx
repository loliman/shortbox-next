import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function NotFound() {
  return (
    <Box
      component="main"
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
          maxWidth: 620,
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
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            right: -20,
            bottom: -20,
            width: "60%",
            height: "55%",
            backgroundImage: "url('/background.png')",
            backgroundPosition: "right bottom",
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
            opacity: 0.06,
            pointerEvents: "none",
          }}
        />

        <Stack spacing={2.5} sx={{ position: "relative", zIndex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip label="404" color="primary" size="small" sx={{ fontWeight: 700 }} />
            <Chip label="Shortbox" variant="outlined" size="small" sx={{ fontWeight: 700 }} />
          </Box>

          <Box>
            <Typography variant="h3" sx={{ fontSize: { xs: "2rem", sm: "2.6rem" }, lineHeight: 1.05, mb: 1 }}>
              Diese Route gibt es nicht.
            </Typography>
            <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
              Der angeforderte Pfad passt zu keiner bekannten Shortbox-Seite. Am schnellsten kommst du
              ueber die deutsche oder US-Uebersicht wieder in den Katalog.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
            <Link href="/de">
              <Button variant="contained">Zu Shortbox DE</Button>
            </Link>
            <Link href="/us">
              <Button variant="outlined">Zu Shortbox US</Button>
            </Link>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}
