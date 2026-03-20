import Layout from "../Layout";
import React from "react";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import { Stack } from "@mui/material";
import NextLink from "next/link";
import type { AppRouteContextValue } from "../../app/routeContext";

function Privacy(props: Readonly<{ routeContext: AppRouteContextValue }>) {
  return (
    <Layout routeContext={props.routeContext}>
      <CardHeader title="Datenschutzerklärung" />

      <CardContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          <Typography>
            Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung
            von personenbezogenen Daten (nachfolgend kurz „Daten“) im Rahmen der Erbringung unserer
            Leistungen sowie innerhalb unseres Onlineangebotes und der mit ihm verbundenen
            Webseiten, Funktionen und Inhalte sowie externen Onlinepräsenzen, wie z.B. unser Social
            Media Profile auf (nachfolgend gemeinsam bezeichnet als „Onlineangebot“). Im Hinblick
            auf die verwendeten Begrifflichkeiten, wie z.B. „Verarbeitung“ oder „Verantwortlicher“
            verweisen wir auf die Definitionen im Art. 4 der Datenschutzgrundverordnung (DSGVO).{" "}
            <Box component="span" sx={{ display: "block" }} />
          </Typography>

          <Stack spacing={1}>
            <Typography variant="h6">Verantwortlicher</Typography>

            <Typography>
              Christian Riese
              <Box component="span" sx={{ display: "block" }} />
              Königstor 34
              <Box component="span" sx={{ display: "block" }} />
              34117 Kassel, Deutschland
              <Box component="span" sx={{ display: "block" }} />
              E-Mail: <Link href="mailto:christian.riese@gmail.com">christian.riese@gmail.com</Link>
              <Box component="span" sx={{ display: "block" }} />
              Link zum Impressum:{" "}
              <Link component={NextLink} href="/impress" underline="hover">
                Impressum
              </Link>
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Arten der verarbeiteten Daten</Typography>

            <Typography>
              - Bestandsdaten (z.B., Personen-Stammdaten, Namen oder Adressen).
              <Box component="span" sx={{ display: "block" }} />
              - Kontaktdaten (z.B., E-Mail, Telefonnummern).
              <Box component="span" sx={{ display: "block" }} />
              - Inhaltsdaten (z.B., Texteingaben, Fotografien, Videos).
              <Box component="span" sx={{ display: "block" }} />
              - Nutzungsdaten (z.B., besuchte Webseiten, Interesse an Inhalten, Zugriffszeiten).
              <Box component="span" sx={{ display: "block" }} />- Meta-/Kommunikationsdaten (z.B.,
              Geräte-Informationen, IP-Adressen).
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Kategorien betroffener Personen</Typography>

            <Typography>
              Besucher und Nutzer des Onlineangebotes (Nachfolgend bezeichnen wir die betroffenen
              Personen zusammenfassend auch als „Nutzer“).
              <Box component="span" sx={{ display: "block" }} />
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Zweck der Verarbeitung</Typography>

            <Typography>
              - Zurverfügungstellung des Onlineangebotes, seiner Funktionen und Inhalte.
              <Box component="span" sx={{ display: "block" }} />
              - Beantwortung von Kontaktanfragen und Kommunikation mit Nutzern.
              <Box component="span" sx={{ display: "block" }} />
              - Sicherheitsmaßnahmen.
              <Box component="span" sx={{ display: "block" }} />
              - Reichweitenmessung/Marketing
              <Box component="span" sx={{ display: "block" }} />
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Verwendete Begrifflichkeiten</Typography>

            <Typography>
              „Personenbezogene Daten“ sind alle Informationen, die sich auf eine identifizierte
              oder identifizierbare natürliche Person (im Folgenden „betroffene Person“) beziehen;
              als identifizierbar wird eine natürliche Person angesehen, die direkt oder indirekt,
              insbesondere mittels Zuordnung zu einer Kennung wie einem Namen, zu einer Kennnummer,
              zu Standortdaten, zu einer Online-Kennung oder zu einem oder mehreren besonderen
              Merkmalen identifiziert werden kann, die Ausdruck der physischen, physiologischen,
              genetischen, psychischen, wirtschaftlichen, kulturellen oder sozialen Identität dieser
              natürlichen Person sind.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              „Verarbeitung“ ist jeder mit oder ohne Hilfe automatisierter Verfahren ausgeführte
              Vorgang oder jede solche Vorgangsreihe im Zusammenhang mit personenbezogenen Daten.
              Der Begriff reicht weit und umfasst praktisch jeden Umgang mit Daten.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              „Pseudonymisierung“ die Verarbeitung personenbezogener Daten in einer Weise, dass die
              personenbezogenen Daten ohne Hinzuziehung zusätzlicher Informationen nicht mehr einer
              spezifischen betroffenen Person zugeordnet werden können, sofern diese zusätzlichen
              Informationen gesondert aufbewahrt werden und technischen und organisatorischen
              Maßnahmen unterliegen, die gewährleisten, dass die personenbezogenen Daten nicht einer
              identifizierten oder identifizierbaren natürlichen Person zugewiesen werden.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              „Profiling“ jede Art der automatisierten Verarbeitung personenbezogener Daten, die
              darin besteht, dass diese personenbezogenen Daten verwendet werden, um bestimmte
              persönliche Aspekte, die sich auf eine natürliche Person beziehen, zu bewerten,
              insbesondere um Aspekte bezüglich Arbeitsleistung, wirtschaftliche Lage, Gesundheit,
              persönliche Vorlieben, Interessen, Zuverlässigkeit, Verhalten, Aufenthaltsort oder
              Ortswechsel dieser natürlichen Person zu analysieren oder vorherzusagen.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Als „Verantwortlicher“ wird die natürliche oder juristische Person, Behörde,
              Einrichtung oder andere Stelle, die allein oder gemeinsam mit anderen über die Zwecke
              und Mittel der Verarbeitung von personenbezogenen Daten entscheidet, bezeichnet.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              „Auftragsverarbeiter“ eine natürliche oder juristische Person, Behörde, Einrichtung
              oder andere Stelle, die personenbezogene Daten im Auftrag des Verantwortlichen
              verarbeitet.
              <Box component="span" sx={{ display: "block" }} />
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Maßgebliche Rechtsgrundlagen</Typography>

            <Typography>
              Nach Maßgabe des Art. 13 DSGVO teilen wir Ihnen die Rechtsgrundlagen unserer
              Datenverarbeitungen mit. Für Nutzer aus dem Geltungsbereich der
              Datenschutzgrundverordnung (DSGVO), d.h. der EU und des EWG gilt, sofern die
              Rechtsgrundlage in der Datenschutzerklärung nicht genannt wird, Folgendes:{" "}
              <Box component="span" sx={{ display: "block" }} />
              Die Rechtsgrundlage für die Einholung von Einwilligungen ist Art. 6 Abs. 1 lit. a und
              Art. 7 DSGVO;
              <Box component="span" sx={{ display: "block" }} />
              Die Rechtsgrundlage für die Verarbeitung zur Erfüllung unserer Leistungen und
              Durchführung vertraglicher Maßnahmen sowie Beantwortung von Anfragen ist Art. 6 Abs. 1
              lit. b DSGVO;
              <Box component="span" sx={{ display: "block" }} />
              Die Rechtsgrundlage für die Verarbeitung zur Erfüllung unserer rechtlichen
              Verpflichtungen ist Art. 6 Abs. 1 lit. c DSGVO;
              <Box component="span" sx={{ display: "block" }} />
              Für den Fall, dass lebenswichtige Interessen der betroffenen Person oder einer anderen
              natürlichen Person eine Verarbeitung personenbezogener Daten erforderlich machen,
              dient Art. 6 Abs. 1 lit. d DSGVO als Rechtsgrundlage.
              <Box component="span" sx={{ display: "block" }} />
              Die Rechtsgrundlage für die erforderliche Verarbeitung zur Wahrnehmung einer Aufgabe,
              die im öffentlichen Interesse liegt oder in Ausübung öffentlicher Gewalt erfolgt, die
              dem Verantwortlichen übertragen wurde ist Art. 6 Abs. 1 lit. e DSGVO.{" "}
              <Box component="span" sx={{ display: "block" }} />
              Die Rechtsgrundlage für die Verarbeitung zur Wahrung unserer berechtigten Interessen
              ist Art. 6 Abs. 1 lit. f DSGVO. <Box component="span" sx={{ display: "block" }} />
              Die Verarbeitung von Daten zu anderen Zwecken als denen, zu denen sie erhoben wurden,
              bestimmt sich nach den Vorgaben des Art 6 Abs. 4 DSGVO.{" "}
              <Box component="span" sx={{ display: "block" }} />
              Die Verarbeitung von besonderen Kategorien von Daten (entsprechend Art. 9 Abs. 1
              DSGVO) bestimmt sich nach den Vorgaben des Art. 9 Abs. 2 DSGVO.{" "}
              <Box component="span" sx={{ display: "block" }} />
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Sicherheitsmaßnahmen</Typography>

            <Typography>
              Wir treffen nach Maßgabe der gesetzlichen Vorgabenunter Berücksichtigung des Stands
              der Technik, der Implementierungskosten und der Art, des Umfangs, der Umstände und der
              Zwecke der Verarbeitung sowie der unterschiedlichen Eintrittswahrscheinlichkeit und
              Schwere des Risikos für die Rechte und Freiheiten natürlicher Personen, geeignete
              technische und organisatorische Maßnahmen, um ein dem Risiko angemessenes Schutzniveau
              zu gewährleisten.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Zu den Maßnahmen gehören insbesondere die Sicherung der Vertraulichkeit, Integrität
              und Verfügbarkeit von Daten durch Kontrolle des physischen Zugangs zu den Daten, als
              auch des sie betreffenden Zugriffs, der Eingabe, Weitergabe, der Sicherung der
              Verfügbarkeit und ihrer Trennung. Des Weiteren haben wir Verfahren eingerichtet, die
              eine Wahrnehmung von Betroffenenrechten, Löschung von Daten und Reaktion auf
              Gefährdung der Daten gewährleisten. Ferner berücksichtigen wir den Schutz
              personenbezogener Daten bereits bei der Entwicklung, bzw. Auswahl von Hardware,
              Software sowie Verfahren, entsprechend dem Prinzip des Datenschutzes durch
              Technikgestaltung und durch datenschutzfreundliche Voreinstellungen.
              <Box component="span" sx={{ display: "block" }} />
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">
              Zusammenarbeit mit Auftragsverarbeitern, gemeinsam Verantwortlichen und Dritten
            </Typography>

            <Typography>
              Sofern wir im Rahmen unserer Verarbeitung Daten gegenüber anderen Personen und
              Unternehmen (Auftragsverarbeitern, gemeinsam Verantwortlichen oder Dritten)
              offenbaren, sie an diese übermitteln oder ihnen sonst Zugriff auf die Daten gewähren,
              erfolgt dies nur auf Grundlage einer gesetzlichen Erlaubnis (z.B. wenn eine
              Übermittlung der Daten an Dritte, wie an Zahlungsdienstleister, zur Vertragserfüllung
              erforderlich ist), Nutzer eingewilligt haben, eine rechtliche Verpflichtung dies
              vorsieht oder auf Grundlage unserer berechtigten Interessen (z.B. beim Einsatz von
              Beauftragten, Webhostern, etc.). <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Sofern wir Daten anderen Unternehmen unserer Unternehmensgruppe offenbaren,
              übermitteln oder ihnen sonst den Zugriff gewähren, erfolgt dies insbesondere zu
              administrativen Zwecken als berechtigtes Interesse und darüberhinausgehend auf einer
              den gesetzlichen Vorgaben entsprechenden Grundlage.{" "}
              <Box component="span" sx={{ display: "block" }} />
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Übermittlungen in Drittländer</Typography>

            <Typography>
              Sofern wir Daten in einem Drittland (d.h. außerhalb der Europäischen Union (EU), des
              Europäischen Wirtschaftsraums (EWR) oder der Schweizer Eidgenossenschaft) verarbeiten
              oder dies im Rahmen der Inanspruchnahme von Diensten Dritter oder Offenlegung, bzw.
              Übermittlung von Daten an andere Personen oder Unternehmen geschieht, erfolgt dies
              nur, wenn es zur Erfüllung unserer (vor)vertraglichen Pflichten, auf Grundlage Ihrer
              Einwilligung, aufgrund einer rechtlichen Verpflichtung oder auf Grundlage unserer
              berechtigten Interessen geschieht. Vorbehaltlich ausdrücklicher Einwilligung oder
              vertraglich erforderlicher Übermittlung, verarbeiten oder lassen wir die Daten nur in
              Drittländern mit einem anerkannten Datenschutzniveau, zu denen die unter dem
              "Privacy-Shield" zertifizierten US-Verarbeiter gehören oder auf Grundlage besonderer
              Garantien, wie z.B. vertraglicher Verpflichtung durch sogenannte
              Standardschutzklauseln der EU-Kommission, dem Vorliegen von Zertifizierungen oder
              verbindlichen internen Datenschutzvorschriften verarbeiten (Art. 44 bis 49 DSGVO,
              <a
                href="https://ec.europa.eu/info/law/law-topic/data-protection/data-transfers-outside-eu_de"
                target="_blank"
                rel="noopener noreferrer nofollow"
              >
                Informationsseite der EU-Kommission
              </a>
              ).
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Rechte der betroffenen Personen</Typography>

            <Typography>
              Sie haben das Recht, eine Bestätigung darüber zu verlangen, ob betreffende Daten
              verarbeitet werden und auf Auskunft über diese Daten sowie auf weitere Informationen
              und Kopie der Daten entsprechend den gesetzlichen Vorgaben.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Sie haben entsprechend. den gesetzlichen Vorgaben das Recht, die Vervollständigung der
              Sie betreffenden Daten oder die Berichtigung der Sie betreffenden unrichtigen Daten zu
              verlangen.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Sie haben nach Maßgabe der gesetzlichen Vorgaben das Recht zu verlangen, dass
              betreffende Daten unverzüglich gelöscht werden, bzw. alternativ nach Maßgabe der
              gesetzlichen Vorgaben eine Einschränkung der Verarbeitung der Daten zu verlangen.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Sie haben das Recht zu verlangen, dass die Sie betreffenden Daten, die Sie uns
              bereitgestellt haben nach Maßgabe der gesetzlichen Vorgaben zu erhalten und deren
              Übermittlung an andere Verantwortliche zu fordern.{" "}
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Sie haben ferner nach Maßgabe der gesetzlichen Vorgaben das Recht, eine Beschwerde bei
              der zuständigen Aufsichtsbehörde einzureichen.
              <Box component="span" sx={{ display: "block" }} />
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Widerrufsrecht</Typography>

            <Typography>
              Sie haben das Recht, erteilte Einwilligungen mit Wirkung für die Zukunft zu
              widerrufen.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Widerspruchsrecht</Typography>

            <Typography>
              <strong>
                Sie können der künftigen Verarbeitung der Sie betreffenden Daten nach Maßgabe der
                gesetzlichen Vorgaben jederzeit widersprechen. Der Widerspruch kann insbesondere
                gegen die Verarbeitung für Zwecke der Direktwerbung erfolgen.
              </strong>
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Löschung von Daten</Typography>

            <Typography>
              Die von uns verarbeiteten Daten werden nach Maßgabe der gesetzlichen Vorgaben gelöscht
              oder in ihrer Verarbeitung eingeschränkt. Sofern nicht im Rahmen dieser
              Datenschutzerklärung ausdrücklich angegeben, werden die bei uns gespeicherten Daten
              gelöscht, sobald sie für ihre Zweckbestimmung nicht mehr erforderlich sind und der
              Löschung keine gesetzlichen Aufbewahrungspflichten entgegenstehen.{" "}
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Sofern die Daten nicht gelöscht werden, weil sie für andere und gesetzlich zulässige
              Zwecke erforderlich sind, wird deren Verarbeitung eingeschränkt. D.h. die Daten werden
              gesperrt und nicht für andere Zwecke verarbeitet. Das gilt z.B. für Daten, die aus
              handels- oder steuerrechtlichen Gründen aufbewahrt werden müssen.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">
              Änderungen und Aktualisierungen der Datenschutzerklärung
            </Typography>

            <Typography>
              Wir bitten Sie sich regelmäßig über den Inhalt unserer Datenschutzerklärung zu
              informieren. Wir passen die Datenschutzerklärung an, sobald die Änderungen der von uns
              durchgeführten Datenverarbeitungen dies erforderlich machen. Wir informieren Sie,
              sobald durch die Änderungen eine Mitwirkungshandlung Ihrerseits (z.B. Einwilligung)
              oder eine sonstige individuelle Benachrichtigung erforderlich wird.
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Hosting und E-Mail-Versand</Typography>

            <Typography>
              Die von uns in Anspruch genommenen Hosting-Leistungen dienen der Zurverfügungstellung
              der folgenden Leistungen: Infrastruktur- und Plattformdienstleistungen,
              Rechenkapazität, Speicherplatz und Datenbankdienste, E-Mail-Versand,
              Sicherheitsleistungen sowie technische Wartungsleistungen, die wir zum Zwecke des
              Betriebs dieses Onlineangebotes einsetzen.
              <Box component="span" sx={{ display: "block" }} />
              <Box component="span" sx={{ display: "block" }} />
              Hierbei verarbeiten wir, bzw. unser Hostinganbieter Bestandsdaten, Kontaktdaten,
              Inhaltsdaten, Vertragsdaten, Nutzungsdaten, Meta- und Kommunikationsdaten von Kunden,
              Interessenten und Besuchern dieses Onlineangebotes auf Grundlage unserer berechtigten
              Interessen an einer effizienten und sicheren Zurverfügungstellung dieses
              Onlineangebotes gem. Art. 6 Abs. 1 lit. f DSGVO i.V.m. Art. 28 DSGVO (Abschluss
              Auftragsverarbeitungsvertrag).
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">Marvel Database</Typography>

            <Typography>
              Wir binden Bilder des Anbieters Fandom, 149 New Montgomery Street, 3rd Floor, San
              Francisco, CA 94105, ein. Nach Angaben von Fandom werden die Daten der Nutzer allein
              zu Zwecken der Darstellung der Bilder im Browser der Nutzer verwendet. Die Einbindung
              erfolgt auf Grundlage unserer berechtigten Interessen an einer korrekten und
              vollständigen Darstellung von US Covern, sowie Berücksichtigung möglicher
              lizenzrechtlicher Restriktionen für deren Einbindung. Datenschutzerklärung:
              <a
                target="_blank"
                rel="noopener noreferrer nofollow"
                href="https://www.fandom.com/privacy-policy"
              >
                https://www.fandom.com/privacy-policy
              </a>
              .
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="h6">ComicGuide</Typography>

            <Typography>
              Wir binden Bilder des Anbieters Star Media, Albert-Schweitzer-Str. 1, 22844
              Norderstedt ein. Nach Angaben von Star Media werden die Daten der Nutzer allein zu
              Zwecken der Darstellung der Bilder im Browser der Nutzer verwendet. Die Einbindung
              erfolgt auf Grundlage unserer berechtigten Interessen an einer korrekten und
              vollständigen Darstellung von Covern deutscher Ausgaben, sowie Berücksichtigung
              möglicher lizenzrechtlicher Restriktionen für deren Einbindung. Datenschutzerklärung:
              <a
                target="_blank"
                rel="noopener noreferrer nofollow"
                href="https://www.comicguide.de/index.php/component/content/article?id=9"
              >
                https://www.comicguide.de/index.php/component/content/article?id=9
              </a>
              .
            </Typography>
          </Stack>

          <Typography>
            <a
              href="https://datenschutz-generator.de"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              Erstellt mit Datenschutz-Generator.de von RA Dr. Thomas Schwenke
            </a>
          </Typography>
        </Stack>
      </CardContent>
    </Layout>
  );
}

export default Privacy;
