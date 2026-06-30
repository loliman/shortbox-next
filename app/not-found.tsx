"use client";

import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";

export default function NotFound() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 3,
        backgroundColor: "background.default",
        color: "text.primary",
        position: "relative",
        overflow: "hidden",
        transition: "background-color 200ms ease, color 200ms ease",
      }}
    >
      {/* Background Watermark */}
      <Box
        data-shortbox-watermark
        sx={(theme) => ({
          position: "absolute",
          right: 0,
          bottom: 0,
          width: { xs: 160, sm: 220 },
          height: { xs: 160, sm: 220 },
          backgroundImage: 'url("/background.png")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right bottom",
          backgroundSize: "contain",
          opacity: 0.08,
          zIndex: 1,
          pointerEvents: "none",
          ...theme.applyStyles("dark", {
            filter: "invert(1)",
            opacity: 0.12,
          }),
        })}
      />

      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 2 }}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 6,
            padding: { xs: 3.5, sm: 5 },
            backgroundColor: "background.paper",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 18px 50px rgba(0,0,0,0.36)"
                : "0 18px 50px rgba(0,0,0,0.06)",
          }}
        >
          {/* Logo */}
          <Box sx={{ mb: 4, display: "flex", justifyContent: "flex-start" }}>
            <Box
              component="img"
              src="/Shortbox_Logo.png"
              alt="Shortbox"
              sx={{
                height: 36,
              }}
            />
          </Box>

          <Typography
            variant="overline"
            component="p"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "secondary.main",
              mb: 1,
              display: "block",
            }}
          >
            HTTP 404
          </Typography>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontFamily: "var(--font-outfit), sans-serif",
              fontWeight: 700,
              lineHeight: 1.1,
              mb: 2,
              fontSize: { xs: "2rem", sm: "2.5rem" },
            }}
          >
            Route nicht gefunden
          </Typography>
          <Typography
            variant="body1"
            sx={{
              lineHeight: 1.6,
              color: "text.secondary",
              mb: 0,
            }}
          >
            Die gewünschte Route ist nicht verfügbar. Bitte prüfe die URL und lade die Seite neu.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
