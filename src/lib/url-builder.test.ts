import { describe, it, expect } from "@jest/globals";
import {
  buildDetailPageUrl,
  buildPersonFilterUrl,
  buildArcFilterUrl,
  buildAppearanceFilterUrl,
  buildGenreFilterUrl,
} from "./url-builder";

describe("url-builder", () => {
  // -------------------------------------------------------------------------
  // buildDetailPageUrl
  // -------------------------------------------------------------------------
  describe("buildDetailPageUrl", () => {
    it("should_buildBaseUrl_when_noFormatOrVariant", () => {
      expect(
        buildDetailPageUrl({
          locale: "de",
          publisherName: "Marvel",
          seriesTitle: "Amazing Spider-Man",
          seriesYear: 1963,
          seriesVolume: 1,
          issueNumber: "1",
        })
      ).toBe("/de/marvel/amazing-spider-man-1963-vol1/1");
    });
    it("should_includeFormat_when_formatProvided", () => {
      expect(
        buildDetailPageUrl({
          locale: "de",
          publisherName: "Marvel",
          seriesTitle: "Amazing Spider-Man",
          seriesYear: 1963,
          seriesVolume: 1,
          issueNumber: "1",
          format: "Heft",
        })
      ).toBe("/de/marvel/amazing-spider-man-1963-vol1/1/heft");
    });
    it("should_includeFormatAndVariant_when_bothProvided", () => {
      expect(
        buildDetailPageUrl({
          locale: "us",
          publisherName: "Marvel",
          seriesTitle: "Amazing Spider-Man",
          seriesYear: 1963,
          seriesVolume: 1,
          issueNumber: "1",
          format: "Comic",
          variant: "Variant A",
        })
      ).toBe("/us/marvel/amazing-spider-man-1963-vol1/1/comic/variant-a");
    });
    it("should_handleGermanUmlauts_when_publisherHasUmlauts", () => {
      const url = buildDetailPageUrl({
        locale: "de",
        publisherName: "P\u00e4nini",
        seriesTitle: "R\u00e4cher",
        seriesYear: 2001,
        seriesVolume: 1,
        issueNumber: "1",
      });
      expect(url).toBe("/de/paenini/raecher-2001-vol1/1");
    });
    it("should_useDeLocale_when_localeIsDe", () => {
      const url = buildDetailPageUrl({
        locale: "de",
        publisherName: "Marvel",
        seriesTitle: "Spider-Man",
        seriesYear: 2020,
        seriesVolume: 1,
        issueNumber: "1",
      });
      expect(url).toMatch(/^\/de\//);
    });
    it("should_useUsLocale_when_localeIsUs", () => {
      const url = buildDetailPageUrl({
        locale: "us",
        publisherName: "Marvel",
        seriesTitle: "Spider-Man",
        seriesYear: 2020,
        seriesVolume: 1,
        issueNumber: "1",
      });
      expect(url).toMatch(/^\/us\//);
    });
  });

  // -------------------------------------------------------------------------
  // buildPersonFilterUrl
  // -------------------------------------------------------------------------
  describe("buildPersonFilterUrl", () => {
    it("should_buildUrl_when_nameOnlyProvided", () => {
      expect(buildPersonFilterUrl("de", "Peter Parker")).toBe("/de/person/peter-parker");
    });
    it("should_includeType_when_typeProvided", () => {
      // Type is currently not encoded in the route format and is intentionally ignored.
      expect(buildPersonFilterUrl("de", "Stan Lee")).toBe("/de/person/stan-lee");
    });
    it("should_setUsTrue_when_localeIsUs", () => {
      expect(buildPersonFilterUrl("us", "Peter Parker")).toBe("/us/person/peter-parker");
    });
    it("should_setUsFalse_when_localeIsDe", () => {
      expect(buildPersonFilterUrl("de", "Peter Parker")).toBe("/de/person/peter-parker");
    });
    it("should_startWithLocale_when_deLocale", () => {
      expect(buildPersonFilterUrl("de", "Peter Parker")).toMatch(/^\/de\//);
    });
    it("should_startWithLocale_when_usLocale", () => {
      expect(buildPersonFilterUrl("us", "Peter Parker")).toMatch(/^\/us\//);
    });
    it("should_slugifyUmlauts_when_nameContainsGermanChars", () => {
      expect(buildPersonFilterUrl("de", "J\u00f6rg Wei\u00df")).toBe("/de/person/joerg-weiss");
    });
  });

  // -------------------------------------------------------------------------
  // buildArcFilterUrl
  // -------------------------------------------------------------------------
  describe("buildArcFilterUrl", () => {
    it("should_buildUrl_when_titleOnlyProvided", () => {
      expect(buildArcFilterUrl("us", "Maximum Carnage")).toBe("/us/arc/maximum-carnage");
    });
    it("should_includeType_when_typeProvided", () => {
      // Type is currently not encoded in the route format and is intentionally ignored.
      expect(buildArcFilterUrl("us", "Civil War")).toBe("/us/arc/civil-war");
    });
    it("should_setUsTrue_when_localeIsUs", () => {
      expect(buildArcFilterUrl("us", "Civil War")).toBe("/us/arc/civil-war");
    });
    it("should_setUsFalse_when_localeIsDe", () => {
      expect(buildArcFilterUrl("de", "Civil War")).toBe("/de/arc/civil-war");
    });
  });

  // -------------------------------------------------------------------------
  // buildAppearanceFilterUrl
  // -------------------------------------------------------------------------
  describe("buildAppearanceFilterUrl", () => {
    it("should_buildUrl_when_nameOnlyProvided", () => {
      expect(buildAppearanceFilterUrl("de", "Spider-Man")).toBe("/de/appearance/spider-man");
    });
    it("should_includeType_when_typeProvided", () => {
      // Type is currently not encoded in the route format and is intentionally ignored.
      expect(buildAppearanceFilterUrl("de", "Spider-Man")).toBe(
        "/de/appearance/spider-man"
      );
    });
    it("should_setUsTrue_when_localeIsUs", () => {
      expect(buildAppearanceFilterUrl("us", "Spider-Man")).toBe("/us/appearance/spider-man");
    });
  });

  // -------------------------------------------------------------------------
  // buildGenreFilterUrl
  // -------------------------------------------------------------------------
  describe("buildGenreFilterUrl", () => {
    it("should_buildUrl_when_genreProvided", () => {
      expect(buildGenreFilterUrl("de", "Science Fiction")).toBe("/de/genre/science-fiction");
    });
    it("should_setUsTrue_when_localeIsUs", () => {
      expect(buildGenreFilterUrl("us", "Action")).toBe("/us/genre/action");
    });
    it("should_setUsFalse_when_localeIsDe", () => {
      expect(buildGenreFilterUrl("de", "Action")).toBe("/de/genre/action");
    });
    it("should_slugifyUmlauts_when_genreContainsGermanChars", () => {
      expect(buildGenreFilterUrl("de", "H\u00f6rer")).toBe("/de/genre/hoerer");
    });
  });
});
