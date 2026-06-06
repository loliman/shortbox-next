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
});
