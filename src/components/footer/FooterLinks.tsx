import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Link from "next/link";

type FooterLinksProps = {
  isPhonePortrait?: boolean;
};

const footerButtonSx = { px: 0.75, color: "text.secondary", minWidth: 0 };

export default function FooterLinks(props: Readonly<FooterLinksProps>) {
  const showExtendedContactText = !props.isPhonePortrait;

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
          component={Link}
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="/about"
        >
          Über
        </Button>
        <Button
          component={Link}
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="/contact"
        >
          Kontakt
          {showExtendedContactText ? " / Fehler melden / Unterstützen" : ""}
        </Button>
        <Button
          component={Link}
          size="small"
          variant="text"
          color="inherit"
          sx={footerButtonSx}
          href="/impress"
        >
          Impressum
        </Button>
        <Button
          component={Link}
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
