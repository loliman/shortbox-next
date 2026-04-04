import { validatePublicAutocompleteBody } from "./public-autocomplete-body";

describe("validatePublicAutocompleteBody", () => {
  it("keeps nested autocomplete variables instead of stripping them", async () => {
    await expect(
      validatePublicAutocompleteBody({
        source: "series",
        variables: {
          pattern: "Spider-Man",
          publisher: {
            name: "Panini - Marvel & Icon",
            us: false,
          },
        },
        offset: 0,
        limit: 10,
      })
    ).resolves.toEqual({
      source: "series",
      variables: {
        pattern: "Spider-Man",
        publisher: {
          name: "Panini - Marvel & Icon",
          us: false,
        },
      },
      offset: 0,
      limit: 10,
    });
  });

  it("strips unknown top-level properties but keeps variables only when they are plain objects", async () => {
    await expect(
      validatePublicAutocompleteBody({
        source: "publishers",
        variables: ["not", "an", "object"],
        offset: 3,
        limit: 5,
        unknown: "remove me",
      })
    ).resolves.toEqual({
      source: "publishers",
      variables: undefined,
      offset: 3,
      limit: 5,
    });
  });

  it("rejects unsupported autocomplete sources", async () => {
    await expect(
      validatePublicAutocompleteBody({
        source: "stories",
      })
    ).rejects.toThrow();
  });
});
