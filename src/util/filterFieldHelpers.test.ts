import { getPattern, updateField } from "./filterFieldHelpers";

describe("filterFieldHelpers", () => {
  it("returns trailing pattern value when present", () => {
    expect(getPattern([], "name")).toBeNull();
    expect(getPattern([{ name: "Spider-Man" }], "name")).toBeNull();
    expect(getPattern([{ pattern: true, name: "Spi" }], "name")).toBe("Spi");
  });

  it("writes live placeholder values", () => {
    const setFieldValue = jest.fn();

    updateField("Spi", true, [], setFieldValue, "stories[0].individuals", "name");

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { pattern: true, name: "Spi" },
    ]);
  });

  it("updates trailing live placeholder when one already exists", () => {
    const setFieldValue = jest.fn();
    const values = [{ name: "Peter Parker" }, { pattern: true, name: "Old" }];

    updateField("New", true, values as any, setFieldValue, "stories[0].individuals", "name");

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker" },
      { pattern: true, name: "New" },
    ]);
  });

  it("writes live placeholder when values are undefined", () => {
    const setFieldValue = jest.fn();

    updateField("Ghost", true, undefined, setFieldValue, "stories[0].individuals", "name");

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { pattern: true, name: "Ghost" },
    ]);
  });

  it("selects and extends individual type entries", () => {
    const setFieldValue = jest.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }];

    updateField(
      {
        action: "select-option",
        option: { name: "Peter Parker" },
        type: "PENCILER",
        role: "Penciler",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["WRITER", "PENCILER"], role: ["Writer", "Penciler"] },
    ]);
  });

  it("updates existing appearance entries with scalar type and role", () => {
    const setFieldValue = jest.fn();
    const values = [{ name: "Spider-Man", type: "HERO", role: "Hero" }];

    updateField(
      {
        action: "select-option",
        option: { __typename: "Appearance", name: "Spider-Man" },
        type: "VILLAIN",
        role: "Villain",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", []);
  });

  it("adds new non-appearance entry when selecting unknown option", () => {
    const setFieldValue = jest.fn();

    updateField(
      {
        action: "select-option",
        option: { name: "Mary Jane" },
        type: "WRITER",
        role: "Writer",
      },
      false,
      [],
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Mary Jane", type: ["WRITER"], role: ["Writer"] },
    ]);
  });

  it("handles frozen select options without mutating source objects", () => {
    const setFieldValue = jest.fn();
    const option = Object.freeze({ name: "Sue Storm" });

    updateField(
      {
        action: "select-option",
        option: option as any,
        type: "WRITER",
        role: "Writer",
      },
      false,
      [],
      setFieldValue,
      "individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("individuals", [
      { name: "Sue Storm", type: ["WRITER"], role: ["Writer"] },
    ]);
  });

  it("handles deselect-option with missing payload type and role", () => {
    const setFieldValue = jest.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }];

    updateField(
      {
        action: "deselect-option",
        option: { name: "Peter Parker" },
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Peter Parker", type: ["WRITER", ""], role: ["Writer", ""] },
    ]);
  });

  it("adds unknown appearance entries via select-option", () => {
    const setFieldValue = jest.fn();

    updateField(
      {
        action: "select-option",
        option: { __typename: "Appearance", name: "Felicia Hardy" },
        type: "ALLY",
        role: "Support",
      },
      false,
      [],
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", []);
  });

  it("removes types and drops empty individual entries", () => {
    const setFieldValue = jest.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"], role: ["Writer"] }];

    updateField(
      {
        action: "remove-value",
        name: "stories[0].individuals",
        removedValue: { name: "Peter Parker" },
        type: "WRITER",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", []);
  });

  it("removes exact appearance entry when removing a value", () => {
    const setFieldValue = jest.fn();

    updateField(
      {
        action: "remove-value",
        name: "stories[0].appearances",
        removedValue: { name: "Spider-Man" },
        type: "HERO",
      },
      false,
      [
        { name: "Spider-Man", type: "HERO", role: "Hero" },
        { name: "Mary Jane", type: "ALLY", role: "Friend" },
      ] as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].appearances", []);
  });

  it("supports create-option and clear for appearance mode", () => {
    const setFieldValue = jest.fn();
    const values = [{ name: "Spider-Man", type: ["HERO"], role: ["Hero"] }];

    updateField(
      {
        action: "create-option",
        type: "WRITER",
        role: "Writer",
      },
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", [
      { name: "Spider-Man", type: ["HERO"], role: ["Hero"] },
      { name: "Spider-Man", type: ["WRITER"], role: ["Writer"] },
    ]);

    updateField(
      {
        action: "clear",
        name: "stories[0].appearances",
        type: "HERO",
      },
      false,
      [{ name: "Spider-Man", type: "HERO", role: "Hero" }] as any,
      setFieldValue,
      "stories[0].appearances",
      "name"
    );

    expect(setFieldValue).toHaveBeenLastCalledWith("stories[0].appearances", []);
  });

  it("clears matching types from non-appearance entries", () => {
    const setFieldValue = jest.fn();
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
      { name: "Peter Parker", type: ["PENCILER"], role: ["Writer", "Penciler"] },
    ]);
  });

  it("handles create-option without previous values", () => {
    const setFieldValue = jest.fn();

    updateField(
      {
        action: "create-option",
      } as any,
      false,
      undefined,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("stories[0].individuals", []);
  });

  it("ignores empty string and unsupported actions", () => {
    const setFieldValue = jest.fn();
    const values = [{ name: "Peter Parker", type: ["WRITER"] }];

    updateField("", true, values as any, setFieldValue, "stories[0].individuals", "name");
    updateField(
      { action: "unknown" } as any,
      false,
      values as any,
      setFieldValue,
      "stories[0].individuals",
      "name"
    );

    expect(setFieldValue).not.toHaveBeenCalled();
  });

  it("stores selected arrays for non-typed multi-select fields", () => {
    const setFieldValue = jest.fn();

    updateField(
      [
        { name: "Marvel", us: false },
        { pattern: true, name: "Mar" },
      ],
      false,
      [],
      setFieldValue,
      "publishers",
      "name"
    );

    expect(setFieldValue).toHaveBeenCalledWith("publishers", [{ name: "Marvel", us: false }]);
  });
});
