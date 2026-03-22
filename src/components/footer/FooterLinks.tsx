import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

const footerButtonSx = { px: 0.75, color: "text.secondary", minWidth: 0 };

export default function FooterLinks() {
  return (
    <Box
      component="nav"
      aria-label="Footer"
      sx={{
        color: "text.secondary",
        width: "100%",
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        useFlexGap
        flexWrap="wrap"
        alignItems="center"
        justifyContent={{ xs: "center", sm: "flex-end" }}
      >
        <Button
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="/about"
        >
          Über
        </Button>
        <Button
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="/contact"
        >
          Kontakt
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            {" / Fehler melden / Unterstützen"}
          </Box>
        </Button>
        <Button
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="/impress"
        >
          Impressum
        </Button>
        <Button
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="/privacy"
        >
          Datenschutz
        </Button>
        <Button
          component="a"
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="https://github.com/loliman"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </Button>
      </Stack>
    </Box>
  );
}
