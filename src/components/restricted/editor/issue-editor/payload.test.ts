import { buildIssueMutationVariables } from "./payload";
import type { IssueEditorFormValues } from "./types";

function baseValues(us = false): IssueEditorFormValues {
  return {
    title: "Issue 1",
    series: {
      title: "Spider-Man",
      volume: 1,
      publisher: { name: "Marvel", us },
    },
    number: "1",
    variant: "A",
    cover: "",
    format: "Heft",
    limitation: "1000",
    pages: 44,
    releasedate: "2026-01-01",
    price: "4.99",
    currency: "EUR",
    individuals: [
      { name: "Peter Parker", type: ["WRITER", "WRITER"] },
      { name: "Peter Parker", type: "PENCILER" },
    ],
    addinfo: "note",
    comicguideid: 42,
    isbn: "isbn",
    arcs: [{ title: "Civil War", type: "EVENT", __typename: "Arc" }],
    copyBatch: {
      enabled: false,
      count: 1,
      prefix: "",
    },
    stories: [
      {
        title: "Story A",
        exclusive: false,
        parent: {
          issue: {
            series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel", us: false } },
          },
        },
        individuals: [
          { name: "Peter Parker", type: ["WRITER"] },
          { name: "Peter Parker", type: "PENCILER" },
        ],
        appearances: [
          { name: "Spider-Man", type: "FEATURED" },
          { name: "Venom", type: "ANTAGONIST" },
        ],
      },
    ],
  };
}

describe("buildIssueMutationVariables", () => {
  it("includes comicguideid and relation payload for non-US issues", () => {
    const values = baseValues(false);
    const result = buildIssueMutationVariables(values, values, true);
    const item = result.item as any;

    expect(item.title).toBe("Issue 1");
    expect(item.number).toBe("1");
    expect(item.format).toBe("Heft");
    expect(item.variant).toBe("A");
    expect(item.releasedate).toBe("2026-01-01");
    expect(item.pages).toBe(44);
    expect(item.price).toBe(4.99);
    expect(item.currency).toBe("EUR");
    expect(item.isbn).toBe("isbn");
    expect(item.limitation).toBe("1000");
    expect(item.addinfo).toBe("note");
    expect(item.comicguideid).toBe(42);
    expect(item.series).toEqual({
      title: "Spider-Man",
      volume: 1,
      publisher: { name: "Marvel", us: false },
    });
    expect(item.individuals).toBeUndefined();
    expect(item.arcs).toBeUndefined();
    expect(item.stories).toHaveLength(1);
    expect(item.stories[0]).toMatchObject({
      title: "Story A",
      exclusive: false,
      parent: {
        issue: {
          series: {
            title: "Spider-Man",
            volume: 1,
            publisher: { name: "Marvel", us: false },
          },
        },
      },
      individuals: [{ name: "Peter Parker", type: ["WRITER", "PENCILER"] }],
      appearances: [
        { name: "Spider-Man", type: "FEATURED" },
        { name: "Venom", type: "ANTAGONIST" },
      ],
    });
    expect(item.verified).toBeUndefined();
    expect(item.collected).toBeUndefined();

    expect(result.old).toEqual({
      series: { title: "Spider-Man", volume: 1, publisher: { name: "Marvel", us: false } },
      number: "1",
      format: "Heft",
      variant: "A",
    });
  });

  it("drops DE-only fields for US issues and preserves parent references", () => {
    const values = baseValues(true);
    (values.stories[0] as any).exclusive = true;

    const result = buildIssueMutationVariables(values, values, false);
    const item = result.item as any;

    expect(item.format).toBeUndefined();
    expect(item.limitation).toBeUndefined();
    expect(item.pages).toBeUndefined();
    expect(item.comicguideid).toBeUndefined();
    expect(item.isbn).toBeUndefined();
    expect(item.price).toBeUndefined();
    expect(item.currency).toBeUndefined();
    expect(item.individuals).toBeUndefined();
    expect(item.arcs).toBeUndefined();
    expect(item.stories).toHaveLength(1);
    expect(item.stories[0].exclusive).toBe(false);
    expect(item.stories[0].parent).toMatchObject({
      issue: {
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: { name: "Marvel", us: false },
        },
      },
    });
    expect(result.old).toBeUndefined();
  });

  it("keeps a parent reference even when the story is marked exclusive in the form state", () => {
    const values = baseValues(false);
    (values.stories[0] as any).exclusive = true;

    const result = buildIssueMutationVariables(values, values, false);
    const item = result.item as any;

    expect(item.stories).toHaveLength(1);
    expect(item.stories[0].exclusive).toBe(false);
    expect(item.stories[0].parent).toMatchObject({
      issue: {
        series: {
          title: "Spider-Man",
          volume: 1,
          publisher: { name: "Marvel", us: false },
        },
      },
    });
  });

  it("sanitizes nested relation payload and keeps parent references", () => {
    const values = baseValues(false) as any;
    values.publisher = { name: "Marvel", us: false, __typename: "Publisher" };
    values.stories = [
      {
        title: "Story B",
        exclusive: false,
        parent: {
          issue: {
            series: { title: "Spider-Man", volume: 1, __typename: "Series" },
          },
        },
        appearances: [{ name: "Watcher", type: "CAMEO", __typename: "Appearance" }],
      },
    ];

    const result = buildIssueMutationVariables(values, values, false);
    const item = result.item as any;

    expect(item.publisher).toBeUndefined();
    expect(item.stories).toHaveLength(1);
    expect(item.stories[0]).toMatchObject({
      title: "Story B",
      parent: {
        issue: {
          series: {
            title: "Spider-Man",
            volume: 1,
          },
        },
      },
      appearances: [{ name: "Watcher", type: "CAMEO" }],
    });
    expect(item.series).toEqual({
      title: "Spider-Man",
      volume: 1,
      publisher: { name: "Marvel", us: false },
    });
  });

  it("includes batch metadata when copy mode should auto-generate variants", () => {
    const values = baseValues(false);
    values.copyBatch = {
      enabled: true,
      count: 3,
      prefix: "Panini Exclusive",
    };

    const result = buildIssueMutationVariables(values, values, false);

    expect(result.batch).toEqual({
      count: 3,
      prefix: "Panini Exclusive",
    });
  });

  it("omits batch metadata when a single manual variant is created", () => {
    const values = baseValues(false);

    const result = buildIssueMutationVariables(values, values, false);

    expect(result.batch).toBeUndefined();
  });
});
