import { describe, expect, it, vi } from "vitest";
import { getPattern, updateField } from "./helpers";

describe("issue-sections/helpers", () => {
  it("returns pattern value only when trailing entry is a pattern placeholder", () => {
    expect(getPattern(undefined, "name")).toBeNull();
    expect(getPattern([], "name")).toBeNull();
    expect(getPattern([{ name: "Spider-Man" }], "name")).toBeNull();
    expect(getPattern([{ pattern: true, name: "Spi" }], "name")).toBe("Spi");
  });

  it("writes and updates live placeholders", () => {
    const setFieldValue = vi.fn();

    updateField("Spi", true, undefined, setFieldValue, "stories[0].individuals", "name");
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { pattern: true, name: "Spi" },
    ]);

    setFieldValue.mockReset();
    updateField(
      "New",
      true,
      [{ name: "Peter Parker" }, { pattern: true, name: "Old" }],
      setFieldValue,
      "stories[0].individuals",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker" },
      { pattern: true, name: "New" },
    ]);
  });

  it("ignores empty live input", () => {
    const setFieldValue = vi.fn();

    updateField("", true, [], setFieldValue, "stories[0].individuals", "name");
    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it("merges non-appearance types and falls back role to payload type", () => {
    const setFieldValue = vi.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }];

    updateField(
      {
        action: "select-option",
        option: { name: "Peter Parker" },
        type: "PENCILER",
        name: "stories[0].individuals",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      {
        name: "Peter Parker",
        type: ["WRITER", "PENCILER"],
        role: ["Writer", "PENCILER"],
      },
    ]);
  });

  it("does not duplicate existing non-appearance type", () => {
    const setFieldValue = vi.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }];

    updateField(
      {
        action: "deselect-option",
        option: { name: "Peter Parker" },
        type: "WRITER",
        role: "Writer",
        name: "stories[0].individuals",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["WRITER"], role: ["Writer"] },
    ]);
  });

  it("requires payload type when creating new non-appearance entries", () => {
    const setFieldValue = vi.fn();

    updateField(
      {
        action: "select-option",
        option: { name: "Mary Jane" },
        name: "stories[0].individuals",
      },
      false,
      [],
      setFieldValue,
      "stories[0].individuals",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", []);

    setFieldValue.mockReset();
    updateField(
      {
        action: "create-option",
        option: { name: "Mary Jane" },
        type: "EDITOR",
        name: "stories[0].individuals",
      },
      false,
      [],
      setFieldValue,
      "stories[0].individuals",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Mary Jane", type: ["EDITOR"] },
    ]);
  });

  it("handles appearance upsert branches (missing type, empty option, create, update)", () => {
    const setFieldValue = vi.fn();

    updateField(
      {
        action: "select-option",
        option: { name: " " },
        type: "HERO",
        name: "stories[0].appearances",
      },
      false,
      [],
      setFieldValue,
      "stories[0].appearances",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", []);

    setFieldValue.mockReset();
    updateField(
      {
        action: "select-option",
        option: { name: "Spider-Man" },
        name: "stories[0].appearances",
      },
      false,
      [],
      setFieldValue,
      "stories[0].appearances",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", []);

    setFieldValue.mockReset();
    updateField(
      {
        action: "select-option",
        option: { name: "Spider-Man" },
        type: "HERO",
        name: "stories[0].appearances",
      },
      false,
      [],
      setFieldValue,
      "stories[0].appearances",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", [
      { name: "Spider-Man", type: "HERO", role: "HERO" },
    ]);

    setFieldValue.mockReset();
    updateField(
      {
        action: "select-option",
        option: { name: "Spider-Man" },
        type: "HERO",
        role: "Lead",
        name: "stories[0].appearances",
      },
      false,
      [{ name: "Spider-Man", type: "HERO", role: "HERO" }] as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", [
      { name: "Spider-Man", type: "HERO", role: "Lead" },
    ]);
  });

  it("handles remove-value for non-appearance with and without payload type", () => {
    const setFieldValue = vi.fn();

    updateField(
      {
        action: "remove-value",
        name: "stories[0].individuals",
        removedValue: { name: "Peter Parker" },
      },
      false,
      [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }] as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["WRITER"], role: ["Writer"] },
    ]);

    setFieldValue.mockReset();
    updateField(
      {
        action: "remove-value",
        name: "stories[0].individuals",
        removedValue: { name: "Peter Parker" },
        type: "WRITER",
      },
      false,
      [{ name: "Peter Parker", type: ["WRITER", "PENCILER"], role: ["Writer", "Penciler"] }] as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["PENCILER"], role: ["Penciler"] },
    ]);
  });

  it("handles appearance remove and clear branches", () => {
    const setFieldValue = vi.fn();
    const values = [
      { name: "Spider-Man", type: "HERO", role: "Hero" },
      { name: "Mary Jane", type: "ALLY", role: "Friend" },
    ];

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
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", [
      { name: "Mary Jane", type: "ALLY", role: "Friend" },
    ]);

    setFieldValue.mockReset();
    updateField(
      {
        action: "clear",
        name: "stories[0].appearances",
        type: "ALLY",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", [
      { name: "Spider-Man", type: "HERO", role: "Hero" },
    ]);
  });

  it("clears matching non-appearance types across selected entries", () => {
    const setFieldValue = vi.fn();
    const values = [
      { name: "Peter Parker", type: ["WRITER", "PENCILER"], role: ["Writer", "Penciler"] },
      { name: "Mary Jane", type: ["WRITER"], role: ["Writer"] },
    ];

    updateField(
      {
        action: "clear",
        name: "stories[0].individuals",
        type: "WRITER",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["PENCILER"], role: ["Penciler"] },
    ]);
  });

  it("handles non-array and empty type/role normalization via clear/remove paths", () => {
    const setFieldValue = vi.fn();

    updateField(
      {
        action: "clear",
        name: "stories[0].individuals",
        type: "WRITER",
      },
      false,
      [{ name: "No Type Yet" }] as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", []);

    setFieldValue.mockReset();
    updateField(
      {
        action: "remove-value",
        name: "stories[0].individuals",
        removedValue: { name: "Peter Parker" },
        type: "PENCILER",
      },
      false,
      [{ name: "Peter Parker", type: "WRITER", role: "Writer" }] as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );
    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["WRITER"], role: ["Writer"] },
    ]);
  });

  it("keeps existing individual entry when payload type is missing", () => {
    const setFieldValue = vi.fn();

    updateField(
      {
        action: "select-option",
        option: { name: "Peter Parker" },
        name: "stories[0].individuals",
      },
      false,
      [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }] as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["WRITER"], role: ["Writer"] },
    ]);
  });

  it("filters placeholders and invalid appearance entries during strip", () => {
    const setFieldValue = vi.fn();

    updateField(
      {
        action: "clear",
        name: "stories[0].appearances",
        type: "NONE",
      },
      false,
      [
        { pattern: true, name: "placeholder", type: "HERO" },
        { name: "Invalid", type: ["HERO"], role: ["Hero"] },
        { name: "Valid", type: "HERO", role: "Hero" },
      ] as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", [
      { name: "Valid", type: "HERO", role: "Hero" },
    ]);
  });

  it("returns early for unknown actions", () => {
    const setFieldValue = vi.fn();

    updateField(
      {
        action: "unknown",
        name: "stories[0].individuals",
      },
      false,
      [{ name: "Peter Parker", type: ["WRITER"] }] as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).not.toHaveBeenCalled();
  });
});
