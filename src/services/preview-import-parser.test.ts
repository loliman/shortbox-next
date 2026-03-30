import { parsePreviewImportQueue } from "./preview-import-parser";

describe("preview import parser", () => {
  const seriesReader = {
    async findDeSeriesByTitle(title: string) {
      if (title === "Eddie Brock: Carnage") {
        return [{ title, volume: 1, publisherName: "Panini" }];
      }

      if (title === "Miles Morales: Spider-Man") {
        return [{ title, volume: 1, publisherName: "Panini" }];
      }

      if (title === "Venom: Schwarz, Weiss & Blut") {
        return [{ title, volume: 1, publisherName: "Panini" }];
      }

      return [];
    },
  };

  it("creates drafts from preview text blocks including variants and stories", async () => {
    const queue = await parsePreviewImportQueue({
      fileName: "Panini-Vorschau-121.pdf",
      seriesReader,
      text: `
VENOM: SCHWARZ,
WEISS & BLUT
Story: David Michelinie, Al Ewing
Zeichnungen: Erik Larsen
Inhalt: Venom: Black, White & Blood 1-4
140 S. | HC | ca. 24 x 33,5 cm | € 26,-
DOSMA371
31.03.2026
Variant-Cover
auf 333 Ex. lim. HC | € 34,-
DOSMA371V
EDDIE BROCK: CARNAGE 2
Story: Charles Soule
Zeichnungen: Juanan Ramirez
Inhalt: Eddie Brock: Carnage 6-10
116 S. | Softcover | € 15,-
DEBCA002
31.03.2026
MILES MORALES:
SPIDER-MAN 7
Story: Cody Ziglar
Zeichnungen: Marco Renna
Inhalt: Miles Morales: Spider-Man 32-36
116 S. | Softcover | € 15,-
DMILES007
28.04.2026
      `,
    });

    expect(queue.drafts).toHaveLength(4);
    expect(queue.drafts[0]?.values.series.title).toBe("Venom: Schwarz, Weiss & Blut");
    expect(queue.drafts[0]?.values.number).toBe("1");
    expect(queue.drafts[0]?.values.stories).toHaveLength(4);
    expect(queue.drafts[0]?.issueCode).toBe("DOSMA371");
    expect(queue.drafts[1]?.values.variant).toContain("Variant");
    expect(queue.drafts[1]?.issueCode).toBe("DOSMA371V");
    expect(queue.drafts[1]?.values.releasedate).toBe("2026-03-31");
    expect(queue.drafts[2]?.values.series.title).toBe("Eddie Brock: Carnage");
    expect(queue.drafts[2]?.values.number).toBe("2");
    expect(queue.drafts[3]?.values.series.title).toBe("Miles Morales: Spider-Man");
    expect(queue.drafts[3]?.values.number).toBe("7");
  });
});
