import { describe, it, expect } from "@jest/globals";
import {
  validateSlug,
  parsePublisherSlug,
  parseSeriesSlug,
  parseIssueNumber,
  parseFormatSlug,
  parseVariantSlug,
  parsePersonSlug,
  parseArcSlug,
  parseAppearanceSlug,
  parseGenreSlug,
  parseIssueUrl,
} from "./slug-parser";

describe("slug-parser", () => {
  // -------------------------------------------------------------------------
  // validateSlug
  // -------------------------------------------------------------------------
  describe("validateSlug", () => {
    it("should_returnSlug_when_validLowercase", () => {
      expect(validateSlug("marvel")).toBe("marvel");
    });
    it("should_returnSlug_when_validWithHyphens", () => {
      expect(validateSlug("amazing-spider-man-1963-vol1")).toBe(
        "amazing-spider-man-1963-vol1"
      );
    });
    it("should_returnSlug_when_singleCharacter", () => {
      expect(validateSlug("a")).toBe("a");
    });
    it("should_returnNull_when_empty", () => {
      expect(validateSlug("")).toBeNull();
    });
    it("should_returnNull_when_null", () => {
      expect(validateSlug(null)).toBeNull();
    });
    it("should_returnNull_when_undefined", () => {
      expect(validateSlug(undefined)).toBeNull();
    });
    it("should_returnNull_when_startsWithHyphen", () => {
      expect(validateSlug("-bad")).toBeNull();
    });
    it("should_returnNull_when_endsWithHyphen", () => {
      expect(validateSlug("bad-")).toBeNull();
    });
    it("should_returnNull_when_containsUppercase", () => {
      expect(validateSlug("Marvel")).toBeNull();
    });
    it("should_returnNull_when_containsSpace", () => {
      expect(validateSlug("amazing spider")).toBeNull();
    });
    it("should_returnNull_when_containsSpecialChar", () => {
      expect(validateSlug("spider&man")).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // parsePublisherSlug
  // -------------------------------------------------------------------------
  describe("parsePublisherSlug", () => {
    it("should_returnMarvel_when_slugIsMarvel", () => {
      expect(parsePublisherSlug("marvel")).toBe("Marvel");
    });
    it("should_returnDcComics_when_slugIsDcComics", () => {
      expect(parsePublisherSlug("dc-comics")).toBe("Dc Comics");
    });
    it("should_returnNull_when_slugIsEmpty", () => {
      expect(parsePublisherSlug("")).toBeNull();
    });
    it("should_returnNull_when_slugIsNull", () => {
      expect(parsePublisherSlug(null)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // parseSeriesSlug
  // -------------------------------------------------------------------------
  describe("parseSeriesSlug", () => {
    it("should_parseYearAndVolume_when_allPresent", () => {
      expect(parseSeriesSlug("amazing-spider-man-1963-vol1")).toEqual({
        title: "Amazing Spider Man",
        year: 1963,
        volume: 1,
      });
    });
    it("should_parseVolumeOnly_when_noYear", () => {
      expect(parseSeriesSlug("spider-man-vol2")).toEqual({
        title: "Spider Man",
        year: null,
        volume: 2,
      });
    });
    it("should_returnNull_when_noVolSuffix", () => {
      expect(parseSeriesSlug("test-series-1963")).toBeNull();
    });
    it("should_returnNull_when_empty", () => {
      expect(parseSeriesSlug("")).toBeNull();
    });
    it("should_parseMultiWordTitle_when_titleHasHyphens", () => {
      const result = parseSeriesSlug("the-amazing-web-slinging-1963-vol1");
      expect(result?.title).toBe("The Amazing Web Slinging");
      expect(result?.year).toBe(1963);
      expect(result?.volume).toBe(1);
    });
    it("should_handleYear0AsNull_when_yearIs0000", () => {
      const result = parseSeriesSlug("test-series-0000-vol1");
      expect(result?.year).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // parseIssueNumber
  // -------------------------------------------------------------------------
  describe("parseIssueNumber", () => {
    it("should_returnNumber_when_plainNumber", () => {
      expect(parseIssueNumber("1")).toBe("1");
    });
    it("should_decodePercent_when_encodedSlash", () => {
      expect(parseIssueNumber("1%2F2")).toBe("1/2");
    });
    it("should_returnEmpty_when_emptyInput", () => {
      expect(parseIssueNumber("")).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // parseFormatSlug
  // -------------------------------------------------------------------------
  describe("parseFormatSlug", () => {
    it("should_returnHeft_when_slugIsHeft", () => {
      expect(parseFormatSlug("heft")).toBe("Heft");
    });
    it("should_returnComicBook_when_slugIsComicBook", () => {
      expect(parseFormatSlug("comic-book")).toBe("Comic Book");
    });
    it("should_returnUndefined_when_undefined", () => {
      expect(parseFormatSlug(undefined)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // parseVariantSlug
  // -------------------------------------------------------------------------
  describe("parseVariantSlug", () => {
    it("should_returnVariantA_when_slugIsVariantA", () => {
      expect(parseVariantSlug("variant-a")).toBe("Variant A");
    });
    it("should_returnKioskAusgabe_when_slugIsKioskAusgabe", () => {
      expect(parseVariantSlug("kiosk-ausgabe")).toBe("Kiosk Ausgabe");
    });
    it("should_returnUndefined_when_undefined", () => {
      expect(parseVariantSlug(undefined)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // parsePersonSlug
  // -------------------------------------------------------------------------
  describe("parsePersonSlug", () => {
    it("should_returnPeterParker_when_slugIsPeterParker", () => {
      expect(parsePersonSlug("peter-parker")).toBe("Peter Parker");
    });
    it("should_returnStanLee_when_slugIsStanLee", () => {
      expect(parsePersonSlug("stan-lee")).toBe("Stan Lee");
    });
    it("should_returnNull_when_empty", () => {
      expect(parsePersonSlug("")).toBeNull();
    });
    it("should_returnNull_when_null", () => {
      expect(parsePersonSlug(null)).toBeNull();
    });
    it("should_returnNull_when_undefined", () => {
      expect(parsePersonSlug(undefined)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // parseArcSlug
  // -------------------------------------------------------------------------
  describe("parseArcSlug", () => {
    it("should_returnMaximumCarnage_when_slugIsMaximumCarnage", () => {
      expect(parseArcSlug("maximum-carnage")).toBe("Maximum Carnage");
    });
    it("should_returnCivilWar_when_slugIsCivilWar", () => {
      expect(parseArcSlug("civil-war")).toBe("Civil War");
    });
    it("should_returnNull_when_empty", () => {
      expect(parseArcSlug("")).toBeNull();
    });
    it("should_returnNull_when_null", () => {
      expect(parseArcSlug(null)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // parseAppearanceSlug
  // -------------------------------------------------------------------------
  describe("parseAppearanceSlug", () => {
    it("should_returnSpiderMan_when_slugIsSpiderMan", () => {
      expect(parseAppearanceSlug("spider-man")).toBe("Spider Man");
    });
    it("should_returnIronMan_when_slugIsIronMan", () => {
      expect(parseAppearanceSlug("iron-man")).toBe("Iron Man");
    });
    it("should_returnNull_when_empty", () => {
      expect(parseAppearanceSlug("")).toBeNull();
    });
    it("should_returnNull_when_null", () => {
      expect(parseAppearanceSlug(null)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // parseGenreSlug
  // -------------------------------------------------------------------------
  describe("parseGenreSlug", () => {
    it("should_returnScienceFiction_when_slugIsScienceFiction", () => {
      expect(parseGenreSlug("science-fiction")).toBe("Science Fiction");
    });
    it("should_returnAction_when_slugIsAction", () => {
      expect(parseGenreSlug("action")).toBe("Action");
    });
    it("should_returnNull_when_empty", () => {
      expect(parseGenreSlug("")).toBeNull();
    });
    it("should_returnNull_when_null", () => {
      expect(parseGenreSlug(null)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // parseIssueUrl
  // -------------------------------------------------------------------------
  describe("parseIssueUrl", () => {
    it("should_parseAllFields_when_allSegmentsProvided", () => {
      expect(
        parseIssueUrl("marvel", "amazing-spider-man-1963-vol1", "1", "heft", "standard")
      ).toEqual({
        publisherName: "Marvel",
        seriesTitle: "Amazing Spider Man",
        seriesYear: 1963,
        seriesVolume: 1,
        issueNumber: "1",
        format: "Heft",
        variant: "Standard",
      });
    });
    it("should_parseWithoutFormatAndVariant_when_onlyRequiredSegments", () => {
      expect(parseIssueUrl("marvel", "amazing-spider-man-1963-vol1", "1")).toEqual({
        publisherName: "Marvel",
        seriesTitle: "Amazing Spider Man",
        seriesYear: 1963,
        seriesVolume: 1,
        issueNumber: "1",
        format: undefined,
        variant: undefined,
      });
    });
    it("should_returnNull_when_seriesSlugHasNoVolume", () => {
      expect(parseIssueUrl("marvel", "amazing-spider-man-1963", "1")).toBeNull();
    });
    it("should_returnNull_when_issueNumberIsEmpty", () => {
      expect(parseIssueUrl("marvel", "spider-man-vol1", "")).toBeNull();
    });
    it("should_returnNull_when_publisherSlugIsEmpty", () => {
      expect(parseIssueUrl("", "spider-man-vol1", "1")).toBeNull();
    });
    it("should_decodeEncodedIssueNumber_when_numberContainsSlash", () => {
      const result = parseIssueUrl("marvel", "spider-man-vol1", "1%2F2");
      expect(result?.issueNumber).toBe("1/2");
    });
    it("should_parseMultiWordPublisher_when_publisherHasHyphens", () => {
      const result = parseIssueUrl("dc-comics", "batman-1963-vol1", "50");
      expect(result?.publisherName).toBe("Dc Comics");
    });
  });
});
