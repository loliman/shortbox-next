import {
  calculateEbayPrice,
  formatEbayTitle,
  formatEbayDescription,
  calculateSeriesEbayPrice,
  formatSeriesEbayTitle,
  formatIssueNumbersList,
} from "./ebay-logic";
import { pickCheapestNormalVariant } from "../../scripts/ebay-tool/db-helper";

describe("eBay Logic Business Rules", () => {
  describe("calculateEbayPrice", () => {
    it("should_calculate_70_percent_and_round_up_when_original_price_is_given", () => {
      // 14.99 * 0.7 = 10.493 -> Math.ceil = 11
      expect(calculateEbayPrice(14.99)).toBe(11);
      // 4.99 * 0.7 = 3.493 -> Math.ceil = 4
      expect(calculateEbayPrice(4.99)).toBe(4);
      // 10.00 * 0.7 = 7.00 -> Math.ceil = 7
      expect(calculateEbayPrice(10.0)).toBe(7);
      // 12.50 * 0.7 = 8.75 -> Math.ceil = 9
      expect(calculateEbayPrice(12.5)).toBe(9);
    });

    it("should_return_fallback_price_when_original_price_is_null_or_zero", () => {
      expect(calculateEbayPrice(null)).toBe(5);
      expect(calculateEbayPrice(undefined)).toBe(5);
      expect(calculateEbayPrice(0)).toBe(5);
      expect(calculateEbayPrice(-4.99, 10)).toBe(10);
    });
  });

  describe("formatEbayTitle", () => {
    it("should_format_full_title_when_within_limit", () => {
      const title = formatEbayTitle({
        seriesTitle: "Spider-Man",
        volume: 2,
        startYear: 1999,
        number: "12",
        issueTitle: "Die Nacht des Jägers",
        conditionCode: "Z1",
      });
      // "Spider-Man (Vol. 2) (1999) #12 - Die Nacht des Jägers, Zustand Z1"
      expect(title).toBe("Spider-Man (Vol. 2) (1999) #12 - Die Nacht des Jägers, Zustand Z1");
      expect(title.length).toBeLessThanOrEqual(80);
    });

    it("should_omit_issue_title_when_full_title_is_too_long", () => {
      const title = formatEbayTitle({
        seriesTitle: "Die spektakuläre Spinnen-Ausgabe von Ultimate Spider-Man",
        volume: 1,
        startYear: 2000,
        number: "45",
        issueTitle: "Ein extrem langer und ausufernder Comic-Titel der die Grenze sprengt",
        conditionCode: "Z1",
      });
      // "Die spektakuläre Spinnen-Ausgabe von Ultimate Spider-Man (2000) #45, Zustand Z1"
      // Sollte das issueTitle weglassen, da > 80 Zeichen.
      expect(title).not.toContain("Ein extrem langer");
      expect(title.length).toBeLessThanOrEqual(80);
    });

    it("should_omit_volume_when_still_too_long", () => {
      const title = formatEbayTitle({
        seriesTitle: "Eine extrem lange Comicserie mit sehr vielen verschiedenen Bänden und Sonderausgaben",
        volume: 4,
        startYear: 1995,
        number: "100",
        conditionCode: "Z1",
      });
      expect(title).not.toContain("(Vol. 4)");
      expect(title.length).toBeLessThanOrEqual(80);
    });

    it("should_omit_year_when_still_too_long", () => {
      const title = formatEbayTitle({
        seriesTitle: "Ein wirklich unglaublich langer Serienname der fast die gesamten achtzig Zeichen verbraucht",
        volume: 1,
        startYear: 2020,
        number: "1",
        conditionCode: "Z1",
      });
      expect(title).not.toContain("(2020)");
      expect(title.length).toBeLessThanOrEqual(80);
    });

    it("should_preserve_number_and_condition_always", () => {
      const title = formatEbayTitle({
        seriesTitle: "Ein unglaublich übertrieben langer Name für eine Comicserie der wirklich absolut alles sprengt was auf eBay jemals erlaubt sein könnte",
        volume: 2,
        startYear: 2020,
        number: "999",
        conditionCode: "Z3",
      });
      expect(title).toContain("#999");
      expect(title).toContain(", Zustand Z3");
      expect(title.length).toBeLessThanOrEqual(80);
    });

    it("should_include_and_preserve_variant_label_when_given", () => {
      const title = formatEbayTitle({
        seriesTitle: "Spider-Man",
        volume: 1,
        startYear: 2005,
        number: "5",
        variantLabel: "Variant A - Sketch Cover",
        conditionCode: "Z1",
      });
      expect(title).toBe("Spider-Man (2005) #5 (Variant A - Sketch Cover), Zustand Z1");
      expect(title.length).toBeLessThanOrEqual(80);

      // Test Kürzung unter Beibehaltung der Variante
      const longTitle = formatEbayTitle({
        seriesTitle: "Ein unglaublich ausufernder und sehr langer Serienname der fast die gesamten 80 Zeichen verbraucht",
        volume: 2,
        startYear: 2020,
        number: "12",
        variantLabel: "Variant C",
        conditionCode: "Z1",
      });
      expect(longTitle).toContain("(Variant C)");
      expect(longTitle).toContain("#12");
      expect(longTitle).toContain(", Zustand Z1");
      expect(longTitle.length).toBeLessThanOrEqual(80);
    });
  });

  describe("formatEbayDescription", () => {
    it("should_render_complete_html_description_template", () => {
      const desc = formatEbayDescription({
        title: "Spider-Man #12",
        year: 1999,
        publisher: "Panini",
        conditionCode: "Z1",
      });
      expect(desc).toContain("Spider-Man #12");
      expect(desc).toContain("1999");
      expect(desc).toContain("Panini");
      expect(desc).toContain("(Z1)");
      expect(desc).toContain("Versand- und Zahlungsbedingungen:");
      expect(desc).toContain("3,00 €");
      expect(desc).toContain("7,00 €");
      expect(desc).toContain("8,50 €");
      expect(desc).toContain("Versandkostenfrei!");
    });
  });

  describe("pickCheapestNormalVariant", () => {
    it("should_select_cheapest_variant_by_price_when_prices_differ", () => {
      const variants = [
        { id: 1, format: "Heft", variantLabel: "Variant A", price: 19.99 },
        { id: 2, format: "Heft", variantLabel: "", price: 4.99 }, // cheapest
        { id: 3, format: "Hardcover", variantLabel: "", price: 29.99 },
      ];
      const result = pickCheapestNormalVariant(variants);
      expect(result?.id).toBe(2);
    });

    it("should_prioritize_normal_variant_even_if_a_rare_variant_is_cheaper", () => {
      const variants = [
        { id: 1, format: "Heft", variantLabel: "Variant A", price: 4.99 }, // cheaper but rare
        { id: 2, format: "Heft", variantLabel: "", price: 9.99 }, // more expensive but normal
      ];
      const result = pickCheapestNormalVariant(variants);
      expect(result?.id).toBe(2); // should pick the normal one
    });

    it("should_fallback_to_standard_formatting_rules_when_prices_are_equal_or_null", () => {
      const variants = [
        { id: 1, format: "Hardcover", variantLabel: "", price: null },
        { id: 2, format: "Heft", variantLabel: "Variant A", price: null },
        { id: 3, format: "Heft", variantLabel: "", price: null }, // standard heft
      ];
      const result = pickCheapestNormalVariant(variants);
      expect(result?.id).toBe(3); // Heft without label
    });
  });

  describe("Series Logic Helpers", () => {
    describe("calculateSeriesEbayPrice", () => {
      it("should_calculate_70_percent_of_the_sum_of_original_prices_and_round_up", () => {
        const issues = [
          { price: 4.99 },
          { price: 4.99 },
          { price: 14.99 },
        ];
        // 4.99 + 4.99 + 14.99 = 24.97 * 0.7 = 17.479 -> Math.ceil = 18
        expect(calculateSeriesEbayPrice(issues)).toBe(18);
      });

      it("should_fallback_to_5_for_missing_prices_and_calculate_discount", () => {
        const issues = [
          { price: 10.00 },
          { price: null }, // falls back to 5.00
        ];
        // 10.00 + 5.00 = 15.00 * 0.7 = 10.50 -> Math.ceil = 11
        expect(calculateSeriesEbayPrice(issues)).toBe(11);
      });

      it("should_fallback_to_100_if_no_prices_are_provided_at_all", () => {
        expect(calculateSeriesEbayPrice([])).toBe(100);
        expect(calculateSeriesEbayPrice([{ price: null }, { price: 0 }])).toBe(100);
      });
    });

    describe("formatSeriesEbayTitle", () => {
      it("should_format_full_series_title_when_within_limit", () => {
        const title = formatSeriesEbayTitle({
          seriesTitle: "Star Wars",
          volume: 1,
          startYear: 2015,
          conditionCode: "Z1",
        });
        expect(title).toBe("Star Wars (2015) - Komplette Serie, Zustand Z1");
        expect(title.length).toBeLessThanOrEqual(80);
      });

      it("should_truncate_correctly_when_too_long", () => {
        const title = formatSeriesEbayTitle({
          seriesTitle: "Ein extrem ausufernd langer Serientitel über sehr viele Zeilen hinweg",
          volume: 2,
          startYear: 1999,
          conditionCode: "Z1",
        });
        expect(title.length).toBeLessThanOrEqual(80);
        expect(title).toContain("Komplette Serie, Zustand Z1");
      });
    });

    describe("formatIssueNumbersList", () => {
      it("should_format_contiguous_ranges_using_dash", () => {
        expect(formatIssueNumbersList(["1", "2", "3", "4", "5"])).toBe("#1 - #5");
        expect(formatIssueNumbersList(["10", "11", "12", "13"])).toBe("#10 - #13");
      });

      it("should_format_non_contiguous_ranges_using_comma", () => {
        expect(formatIssueNumbersList(["1", "3", "5"])).toBe("#1, #3, #5");
        expect(formatIssueNumbersList(["1", "2"])).toBe("#1, #2"); // too short for range
      });
    });
  });
});
