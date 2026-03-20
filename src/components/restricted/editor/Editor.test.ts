import { describe, expect, it, vi } from "vitest";
import { addToCache, compare, removeFromCache, updateInCache } from "./Editor";
import type { ApolloCache } from "@apollo/client";
import type { DocumentNode } from "graphql";

const issuesQuery = {
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "Issues" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [{ kind: "Field", name: { kind: "Name", value: "issueList" } }],
      },
    },
  ],
} as unknown as DocumentNode;

function createCache(readValue: unknown): ApolloCache<unknown> & {
  readQuery: ReturnType<typeof vi.fn>;
  writeQuery: ReturnType<typeof vi.fn>;
} {
  return {
    readQuery: vi.fn().mockReturnValue(readValue),
    writeQuery: vi.fn(),
  } as unknown as ApolloCache<unknown> & {
    readQuery: ReturnType<typeof vi.fn>;
    writeQuery: ReturnType<typeof vi.fn>;
  };
}

describe("Editor cache helpers", () => {
  it("adds, removes and updates plain list cache entries", () => {
    const cache = createCache({
      issueList: [
        { __typename: "Issue", number: "2", format: "Heft", variant: "" },
        { __typename: "Issue", number: "1", format: "Heft", variant: "B" },
      ],
    });

    addToCache(
      cache,
      issuesQuery,
      { series: { title: "Spider-Man" } },
      { __typename: "Issue", number: "1", format: "Heft", variant: "A" }
    );

    const writtenAfterAdd = cache.writeQuery.mock.calls[0][0].data.issueList;
    expect(writtenAfterAdd.map((item: any) => item.variant)).toEqual(["A", "B", ""]);

    removeFromCache(
      cache,
      issuesQuery,
      { series: { title: "Spider-Man" } },
      { __typename: "Issue", number: "1", format: "Heft", variant: "B" }
    );

    const writtenAfterRemove = cache.writeQuery.mock.calls[1][0].data.issueList;
    expect(writtenAfterRemove.map((item: any) => item.variant)).toEqual(["A", ""]);

    updateInCache(
      cache,
      issuesQuery,
      { series: { title: "Spider-Man" } },
      { __typename: "Issue", number: "1", format: "Heft", variant: "A" },
      { __typename: "Issue", number: "1", format: "Heft", variant: "AA" }
    );

    const writtenAfterUpdate = cache.writeQuery.mock.calls[2][0].data.issueList;
    expect(writtenAfterUpdate.map((item: any) => item.variant)).toEqual(["AA", ""]);
  });

  it("handles connection-shaped cache entries", () => {
    const cache = createCache({
      issueList: {
        edges: [
          { cursor: "0", node: { __typename: "Issue", number: "2", format: "Heft", variant: "" } },
        ],
        pageInfo: { hasNextPage: false, endCursor: "0" },
      },
    });

    addToCache(
      cache,
      issuesQuery,
      { series: { title: "Spider-Man" } },
      { __typename: "Issue", number: "1", format: "Heft", variant: "" }
    );

    const writtenEdges = cache.writeQuery.mock.calls[0][0].data.issueList.edges;
    expect(writtenEdges).toHaveLength(2);
    expect(writtenEdges[0].node.number).toBe("1");
    expect(writtenEdges[1].node.number).toBe("2");
  });

  it("is resilient to missing/invalid cache reads", () => {
    const cache = createCache(null);
    addToCache(cache, issuesQuery, undefined, { __typename: "Issue", number: "1" });
    removeFromCache(cache, issuesQuery, undefined, { __typename: "Issue", number: "1" });
    updateInCache(
      cache,
      issuesQuery,
      undefined,
      { __typename: "Issue", number: "1" },
      { __typename: "Issue", number: "2" }
    );
    expect(cache.writeQuery).not.toHaveBeenCalled();

    const throwingCache = {
      readQuery: vi.fn(() => {
        throw new Error("cache miss");
      }),
      writeQuery: vi.fn(),
    } as unknown as ApolloCache<unknown>;

    addToCache(throwingCache, issuesQuery, undefined, { __typename: "Issue", number: "1" });
    expect((throwingCache as any).writeQuery).not.toHaveBeenCalled();
  });

  it("compares publisher/series/issue entries consistently", () => {
    expect(
      compare({ __typename: "Publisher", name: "Marvel" }, { __typename: "Publisher", name: "DC" })
    ).toBeGreaterThan(0);
    expect(
      compare(
        { __typename: "Series", title: "Spider-Man", volume: 2 },
        { __typename: "Series", title: "Spider-Man", volume: 1 }
      )
    ).toBeGreaterThan(0);
    expect(
      compare(
        { __typename: "Issue", number: "1", format: "Heft", variant: "B" },
        { __typename: "Issue", number: "1", format: "Heft", variant: "A" }
      )
    ).toBeGreaterThan(0);
    expect(compare({ __typename: "Unknown" }, { __typename: "Unknown" })).toBe(0);
  });
});
