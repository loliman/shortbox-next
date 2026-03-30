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
});
