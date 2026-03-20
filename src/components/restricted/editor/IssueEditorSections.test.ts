import { vi } from "vitest";
import { getPattern, updateField } from "./IssueEditorSections";

describe("IssueEditorSections helper", () => {
  it("returns pattern value from last placeholder entry", () => {
    expect(getPattern(null, "name")).toBeNull();
    expect(getPattern([], "name")).toBeNull();
    expect(getPattern([{ name: "Peter" }], "name")).toBeNull();
    expect(getPattern([{ name: "Peter" }, { pattern: true, name: "Spi" }], "name")).toBe("Spi");
  });

  it("updates live pattern placeholder while typing", () => {
    const setFieldValue = vi.fn();

    updateField("Spi", true, [], setFieldValue, "stories[0].individuals", "name");

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { pattern: true, name: "Spi" },
    ]);
  });

  it("adds a new type for an existing person", () => {
    const setFieldValue = vi.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }];

    updateField(
      {
        action: "select-option",
        option: { name: "Peter Parker" },
        type: "PENCILER",
        role: "Penciler",
      },
      false,
      values,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      {
        name: "Peter Parker",
        type: ["WRITER", "PENCILER"],
        role: ["Writer", "Penciler"],
      },
    ]);
  });

  it("removes entries when the last type is deleted", () => {
    const setFieldValue = vi.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }];

    updateField(
      {
        action: "remove-value",
        name: "stories[0].individuals",
        removedValue: { name: "Peter Parker" },
        type: "WRITER",
      },
      false,
      values,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", []);
  });

  it("supports appearance mode select/remove/clear flows", () => {
    const setFieldValue = vi.fn();
    const values = [{ name: "Spider-Man", type: "HERO", role: "Hero" }];

    updateField(
      {
        action: "select-option",
        name: "stories[0].appearances",
        option: { __typename: "Appearance", name: "Wolverine" },
        type: "HERO",
        role: "Hero",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenLastCalledWith("stories[0].appearances", [
      { name: "Spider-Man", type: "HERO", role: "Hero" },
      { __typename: "Appearance", name: "Wolverine", type: "HERO", role: "Hero" },
    ]);

    updateField(
      {
        action: "remove-value",
        name: "stories[0].appearances",
        removedValue: { name: "Spider-Man" },
        type: "HERO",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenLastCalledWith("stories[0].appearances", []);

    updateField(
      {
        action: "clear",
        name: "stories[0].appearances",
        type: "HERO",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenLastCalledWith("stories[0].appearances", []);
  });

  it("ignores unknown actions and empty live updates", () => {
    const setFieldValue = vi.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"] }];

    updateField("", true, values as any, setFieldValue, "stories[0].individuals", "name");
    updateField(
      { action: "unknown-action" } as any,
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).not.toHaveBeenCalled();
  });
});
