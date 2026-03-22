import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Link from "@mui/material/Link";

function Contact() {
  return (
    <>
      <CardHeader title="Kontakt" />

      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          <Typography>
            Shortbox.de ist eine Eigenentwicklung von mir und wird ausschließlich von mir
            weiterentwickelt. Da ich Shortbox.de in meiner Freizeit entwickle und nur in einem
            kleinen Personenkreis teste, werden hier und da Fehler auftauchen. Zwar versuche ich vor
            jedem neuen Release alle noch so kleinen Fehler zu finden und zu beheben, aber wie jeder
            weiß: Es gibt keine Software ohne Fehler.
          </Typography>

          <Typography>
            Solltet ihr einen Fehler finden oder Vorschläge zur Verbesserung haben, meldet euch
            bitte per Mail bei mir. Schreibt dazu bitte eine Mail mit dem Betreff <b>[ERROR]</b>{" "}
            und einer kurzen Beschreibung des Fehlers/des Vorschlags an{" "}
            <Link href="mailto:christian.riese+shortbox@gmail.com">christian.riese+shortbox@gmail.com</Link>.
          </Typography>

          <Typography>
            Inhaltliche Fehler könnt ihr bequem über das "Bug-Icon" (nur auf DE-Ausgaben Ebene sichtbar) unten rechts
            melden. Diese schlagen dann automatisiert bei mir auf, ich prüfe diese und ändere sie dann entsprechend.
          </Typography>

          <Stack spacing={1}>
            <Typography variant="h6">Verantwortlicher</Typography>
            <Typography>
              Shortbox.de ist und bleibt eine kostenlose Datenbank, die von jedem jederzeit
              kostenlos genutzt werden kann. Dennoch verursacht Shortbox.de laufend Kosten, die ich
              privat trage. Wenn ihr das Projekt unterstützen wollt, so bin ich für jede kleine
              finanzielle Unterstützung über{" "}
              <Link
                href="https://paypal.me/ChristianRiese"
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                paypal.me/ChristianRiese
              </Link>{" "}
              dankbar.
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </>
  );
}

export default Contact;
