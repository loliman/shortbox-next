import Layout from "../Layout";
import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";

function Impress() {
  return (
    <Layout>
      <CardHeader title="Impressum" />

      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          <Typography>Angaben gemäß § 5 TMG</Typography>

          <Stack spacing={1}>
            <Typography variant="h6">Verantwortlicher</Typography>
            <Stack spacing={0}>
              <Typography>Christian Riese</Typography>
              <Typography>Königstor 34</Typography>
              <Typography>34117 Kassel, Deutschland</Typography>
            </Stack>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Kontakt</Typography>
            <Typography>
              E-Mail: <Link href="mailto:christian.riese@gmail.com">christian.riese@gmail.com</Link>
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </Typography>
            <Stack spacing={0}>
              <Typography>Christian Riese</Typography>
              <Typography>Königstor 34</Typography>
              <Typography>34117 Kassel</Typography>
            </Stack>
          </Stack>

          <Typography>
            Impressum vom{" "}
            <Link
              href="https://www.impressum-generator.de"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              Impressum Generator
            </Link>{" "}
            der{" "}
            <Link
              href="https://www.kanzlei-hasselbach.de/"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              Kanzlei Hasselbach, Rechtsanwälte für Arbeitsrecht und Familienrecht
            </Link>
          </Typography>
        </Stack>
      </CardContent>
    </Layout>
  );
}

export default Impress;
