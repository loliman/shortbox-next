import { mapIssueToEditorDefaultValues } from "./defaultValues";

describe("mapIssueToEditorDefaultValues", () => {
  it("should_drop_detail_only_variant_fields_when_mapping_issue_edit_defaults", () => {
    const result = mapIssueToEditorDefaultValues(
      {
        id: "123",
        title: "Batman",
        number: "1",
        format: "Heft",
        variant: "",
        variants: null,
        series: {
          title: "Batman",
          volume: 1,
          publisher: {
            name: "Panini",
            us: false,
          },
        },
        stories: [],
      },
      false
    ) as unknown as Record<string, unknown>;

    expect(result.variants).toBeUndefined();
  });

  it("should_format_iso_releasedate_to_yyyy_mm_dd_for_editor", () => {
    const result = mapIssueToEditorDefaultValues(
      {
        id: "123",
        title: "Batman",
        number: "1",
        format: "Heft",
        releasedate: "2026-06-07T00:59:41.000Z",
        series: {
          title: "Batman",
          volume: 1,
          publisher: {
            name: "Panini",
            us: false,
          },
        },
      },
      false
    );

    expect(result.releasedate).toBe("2026-06-07");
  });

  it("should_map_gcdid_from_source_issue", () => {
    const result = mapIssueToEditorDefaultValues(
      {
        id: "123",
        title: "Spider-Man",
        number: "1",
        comicguideid: 5555,
        gcdid: 98765,
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: {
            name: "Marvel",
            us: true,
          },
        },
      },
      true
    );

    expect(result.gcdid).toBe(98765);
    expect(result.comicguideid).toBe(5555);
  });

  it("should_normalize_empty_or_null_gcdid_when_mapping_values", () => {
    const result = mapIssueToEditorDefaultValues(
      {
        id: "123",
        title: "Spider-Man",
        number: "1",
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: {
            name: "Marvel",
            us: true,
          },
        },
      },
      false
    );

    expect(result.gcdid).toBeUndefined();
  });
});
