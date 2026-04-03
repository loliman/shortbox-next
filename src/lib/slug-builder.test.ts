import { describe, it, expect } from "@jest/globals";
import {
  slugify,
  generatePublisherSlug,
  generateSeriesSlug,
  generateFormatSlug,
  generateVariantSlug,
  generatePersonSlug,
  generateArcSlug,
  generateAppearanceSlug,
  generateGenreSlug,
  buildIssueUrlPath,
  buildIssueUrlSegments,
} from "./slug-builder";

describe("slug-builder", () => {
  // -------------------------------------------------------------------------
  // slugify — core rules
  // -------------------------------------------------------------------------
  describe("slugify core rules", () => {
    it("should_convertToLowercase_when_mixedCaseInput", () => {
      expect(slugify("Amazing Spider-Man")).toBe("amazing-spider-man");
    });
    it("should_removeApostrophe_when_apostrophePresent", () => {
      expect(slugify("Spider-Man's Web")).toBe("spider-mans-web");
    });
    it("should_collapseSpaces_when_multipleSpaces", () => {
      expect(slugify("The   Amazing   Spider-Man")).toBe("the-amazing-spider-man");
    });
    it("should_trimHyphens_when_boundaryHyphensPresent", () => {
      expect(slugify("--test--")).toBe("test");
    });
    it("should_returnEmpty_when_emptyNullOrUndefined", () => {
      expect(slugify("")).toBe("");
      expect(slugify(null)).toBe("");
      expect(slugify(undefined)).toBe("");
    });
    it("should_collapseToOneHyphen_when_spaceDashSpace", () => {
      expect(slugify("Panini - Star Wars")).toBe("panini-star-wars");
    });
    it("should_replaceUnderscore_when_underscorePresent", () => {
      expect(slugify("Spider_Man")).toBe("spider-man");
    });
    it("should_removeAmpersand_when_ampersandPresent", () => {
      expect(slugify("Star Wars & Generation")).toBe("star-wars-generation");
    });
  });

  // -------------------------------------------------------------------------
  // slugify — German umlauts
  // -------------------------------------------------------------------------
  describe("slugify German umlauts", () => {
    it("should_expandToAe_when_lowercaseAUmlaut", () => {
      expect(slugify("\u00e4pfel")).toBe("aepfel");
    });
    it("should_expandToAe_when_uppercaseAUmlaut", () => {
      expect(slugify("\u00c4rger")).toBe("aerger");
    });
    it("should_expandToOe_when_lowercaseOUmlaut", () => {
      expect(slugify("h\u00f6lle")).toBe("hoelle");
    });
    it("should_expandToOe_when_uppercaseOUmlaut", () => {
      expect(slugify("\u00d6konom")).toBe("oekonom");
    });
    it("should_expandToUe_when_lowercaseUUmlaut", () => {
      expect(slugify("\u00fcber")).toBe("ueber");
    });
    it("should_expandToUe_when_uppercaseUUmlaut", () => {
      expect(slugify("\u00dcber")).toBe("ueber");
    });
    it("should_expandToSs_when_szlig", () => {
      expect(slugify("stra\u00dfe")).toBe("strasse");
    });
    it("should_handleMix_when_fuesse", () => {
      expect(slugify("F\u00fc\u00dfe")).toBe("fuesse");
    });
  });

  // -------------------------------------------------------------------------
  // slugify — NFD normalization of accented Latin characters
  // -------------------------------------------------------------------------
  describe("slugify NFD normalization", () => {
    it("should_stripAcute_when_eAcute", () => {
      expect(slugify("caf\u00e9")).toBe("cafe");
    });
    it("should_stripDiaeresis_when_iDiaeresis", () => {
      expect(slugify("na\u00efve")).toBe("naive");
    });
    it("should_stripGrave_when_eGrave", () => {
      expect(slugify("cr\u00e8me")).toBe("creme");
    });
    it("should_stripCedilla_when_cedilla", () => {
      expect(slugify("fa\u00e7ade")).toBe("facade");
    });
    it("should_stripTilde_when_nTilde", () => {
      expect(slugify("Ni\u00f1o")).toBe("nino");
    });
  });

  // -------------------------------------------------------------------------
  // slugify — stability
  // -------------------------------------------------------------------------
  describe("slugify stability", () => {
    it("should_beDeterministic_when_calledMultipleTimes", () => {
      const input = "Amazing \u00dcber-Spidey & Co. (2023)";
      expect(slugify(input)).toBe(slugify(input));
    });
    it("should_containOnlySafeChars_when_mixedSpecialChars", () => {
      const result = slugify("Panini \u2013 \u00d6sterreich / Spider-Ma\u00f1 (2023)!");
      expect(result).toMatch(/^[a-z0-9-]+$/);
    });
  });

  // -------------------------------------------------------------------------
  // Entity slug generators
  // -------------------------------------------------------------------------
  describe("generatePublisherSlug", () => {
    it("should_returnMarvel_when_inputIsMarvel", () => {
      expect(generatePublisherSlug("Marvel")).toBe("marvel");
    });
    it("should_returnDcComics_when_inputIsDCComics", () => {
      expect(generatePublisherSlug("DC Comics")).toBe("dc-comics");
    });
    it("should_removeAmpersand_when_nameContainsAmpersand", () => {
      expect(generatePublisherSlug("Simon & Schuster")).toBe("simon-schuster");
    });
    it("should_handleUmlaut_when_germanPublisherName", () => {
      expect(generatePublisherSlug("D\u00e4stner Verlag")).toBe("daestner-verlag");
    });
  });

  describe("generateSeriesSlug", () => {
    it("should_includeYearAndVol_when_allFieldsProvided", () => {
      expect(generateSeriesSlug("Amazing Spider-Man", 1963, 1)).toBe(
        "amazing-spider-man-1963-vol1"
      );
    });
    it("should_omitYear_when_yearIsUndefined", () => {
      expect(generateSeriesSlug("Spider-Man", undefined, 2)).toBe("spider-man-vol2");
    });
    it("should_omitYear_when_yearIsZero", () => {
      expect(generateSeriesSlug("Test Series", 0, 1)).toBe("test-series-vol1");
    });
    it("should_defaultToVol1_when_volumeIsNull", () => {
      expect(generateSeriesSlug("Test Series", 2020, null)).toBe("test-series-2020-vol1");
    });
    it("should_handleUmlaut_when_germanSeriesTitle", () => {
      expect(generateSeriesSlug("R\u00e4cher", 2001, 1)).toBe("raecher-2001-vol1");
    });
  });

  describe("generateFormatSlug", () => {
    it("should_returnHeft_when_inputIsHeft", () => {
      expect(generateFormatSlug("Heft")).toBe("heft");
    });
    it("should_returnComicBook_when_inputIsComicBook", () => {
      expect(generateFormatSlug("Comic Book")).toBe("comic-book");
    });
    it("should_returnTradePaperback_when_inputIsThreeWords", () => {
      expect(generateFormatSlug("Trade Paperback")).toBe("trade-paperback");
    });
  });

  describe("generateVariantSlug", () => {
    it("should_returnStandard_when_inputIsStandard", () => {
      expect(generateVariantSlug("Standard")).toBe("standard");
    });
    it("should_returnVariantA_when_inputIsVariantA", () => {
      expect(generateVariantSlug("Variant A")).toBe("variant-a");
    });
    it("should_returnKioskAusgabe_when_inputIsGermanVariant", () => {
      expect(generateVariantSlug("Kiosk Ausgabe")).toBe("kiosk-ausgabe");
    });
  });

  describe("generatePersonSlug", () => {
    it("should_returnPeterParker_when_inputIsFullName", () => {
      expect(generatePersonSlug("Peter Parker")).toBe("peter-parker");
    });
    it("should_returnStanLee_when_inputIsStanLee", () => {
      expect(generatePersonSlug("Stan Lee")).toBe("stan-lee");
    });
    it("should_returnEmpty_when_inputIsNull", () => {
      expect(generatePersonSlug(null)).toBe("");
    });
    it("should_returnEmpty_when_inputIsUndefined", () => {
      expect(generatePersonSlug(undefined)).toBe("");
    });
  });

  describe("generateArcSlug", () => {
    it("should_returnMaximumCarnage_when_inputIsArcName", () => {
      expect(generateArcSlug("Maximum Carnage")).toBe("maximum-carnage");
    });
    it("should_returnCivilWar_when_inputIsCivilWar", () => {
      expect(generateArcSlug("Civil War")).toBe("civil-war");
    });
    it("should_returnEmpty_when_inputIsNull", () => {
      expect(generateArcSlug(null)).toBe("");
    });
  });

  describe("generateAppearanceSlug", () => {
    it("should_returnSpiderMan_when_inputIsSpiderMan", () => {
      expect(generateAppearanceSlug("Spider-Man")).toBe("spider-man");
    });
    it("should_returnIronMan_when_inputIsIronMan", () => {
      expect(generateAppearanceSlug("Iron Man")).toBe("iron-man");
    });
    it("should_returnEmpty_when_inputIsNull", () => {
      expect(generateAppearanceSlug(null)).toBe("");
    });
  });

  describe("generateGenreSlug", () => {
    it("should_returnScienceFiction_when_inputIsTwoWords", () => {
      expect(generateGenreSlug("Science Fiction")).toBe("science-fiction");
    });
    it("should_returnAction_when_inputIsAction", () => {
      expect(generateGenreSlug("Action")).toBe("action");
    });
    it("should_returnEmpty_when_inputIsNull", () => {
      expect(generateGenreSlug(null)).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // URL path builders
  // -------------------------------------------------------------------------
  describe("buildIssueUrlPath", () => {
    it("should_buildBaseUrl_when_noFormatOrVariant", () => {
      expect(
        buildIssueUrlPath({
          locale: "de",
          publisherSlug: "marvel",
          seriesSlug: "amazing-spider-man-1963-vol1",
          issueNumber: "1",
        })
      ).toBe("/de/marvel/amazing-spider-man-1963-vol1/1");
    });
    it("should_appendFormatAndVariant_when_bothProvided", () => {
      expect(
        buildIssueUrlPath({
          locale: "us",
          publisherSlug: "marvel",
          seriesSlug: "amazing-spider-man-1963-vol1",
          issueNumber: "1",
          formatSlug: "comic",
          variantSlug: "variant-a",
        })
      ).toBe("/us/marvel/amazing-spider-man-1963-vol1/1/comic/variant-a");
    });
    it("should_appendFormatOnly_when_noVariant", () => {
      expect(
        buildIssueUrlPath({
          locale: "de",
          publisherSlug: "marvel",
          seriesSlug: "amazing-spider-man-1963-vol1",
          issueNumber: "1",
          formatSlug: "heft",
        })
      ).toBe("/de/marvel/amazing-spider-man-1963-vol1/1/heft");
    });
    it("should_encodeSlash_when_issueNumberContainsSlash", () => {
      const result = buildIssueUrlPath({
        locale: "de",
        publisherSlug: "marvel",
        seriesSlug: "test-vol1",
        issueNumber: "1/2",
      });
      expect(result).toContain("1%2F2");
    });
  });

  describe("buildIssueUrlSegments", () => {
    it("should_buildAllSegments_when_allDataProvided", () => {
      expect(
        buildIssueUrlSegments({
          locale: "de",
          publisherName: "Marvel",
          seriesTitle: "Amazing Spider-Man",
          seriesStartYear: 1963,
          seriesVolume: 1,
          issueNumber: "1",
          format: "Heft",
          variant: "Kiosk Ausgabe",
        })
      ).toEqual({
        locale: "de",
        publisherSlug: "marvel",
        seriesSlug: "amazing-spider-man-1963-vol1",
        issueNumber: "1",
        formatSlug: "heft",
        variantSlug: "kiosk-ausgabe",
      });
    });
    it("should_omitFormatAndVariant_when_notProvided", () => {
      expect(
        buildIssueUrlSegments({
          locale: "us",
          publisherName: "Marvel",
          seriesTitle: "Spider-Man",
          seriesStartYear: undefined,
          seriesVolume: 1,
          issueNumber: "100",
        })
      ).toEqual({
        locale: "us",
        publisherSlug: "marvel",
        seriesSlug: "spider-man-vol1",
        issueNumber: "100",
        formatSlug: undefined,
        variantSlug: undefined,
      });
    });
  });
});
