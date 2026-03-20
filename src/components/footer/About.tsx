import Layout from "../Layout";
import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";

function About() {
  return (
    <Layout>
      <CardHeader title="Über" />

      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={1.5}>
          <Typography color="text.secondary">
            Shortbox listet alle deutschen Marvel Veröffentlichungen detailliert auf und ordnet
            diese den entsprechenden US Geschichten zu.
          </Typography>

          <Typography color="text.secondary">
            Angefangen über Geschichten der bekanntesten Superhelden Spider-Man, Deadpool, den
            X-Men oder den Avengers oder unbekannteren Helden wie Moon Knight und den New Mutants,
            über Comics zum Marvel Cinematic Universe mit Captain America, Captain Marvel und Iron
            Man bis hin zu Western-Comics, Horror-Comics und Kinder-Comics wie den Glücksbärchis
            oder der Police Acadamy findet ihr hier alle Veröffentlichungen in offiziellen
            Ausgaben, Raubkopien oder Fan-Comics.
          </Typography>

          <Typography color="text.secondary">
            Inspiriert durch{" "}
            <Link
              href="https://www.maxithecat.de/UHBMCC/INDEX.HTM"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              maxithecat&apos;s UHBMCC
            </Link>{" "}
            wurde Shortbox 2018 ins Leben gerufen und ist ein vollständig privates Projekt für
            Marvel-Fans von Marvel-Fans.
          </Typography>

          <Typography color="text.secondary">
            Die gelisteten Informationen unterliegen der{" "}
            <Link
              href="https://creativecommons.org/licenses/by/3.0/de/"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              Creative Commons License 3.0
            </Link>
            . Ausgenommen sind die vom{" "}
            <Link
              href="https://www.comicguide.de/index.php"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              ComicGuide
            </Link>{" "}
            bereitgestellten Cover. Diese dürfen ohne Genehmigung weiter verbreitet werden.
          </Typography>
        </Stack>
      </CardContent>
    </Layout>
  );
}

export default About;
