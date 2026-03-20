import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}));

vi.mock("@apollo/client", () => ({
  useQuery: useQueryMock,
}));

import PaginatedQuery from "./PaginatedQuery";

type FetchMoreArg = {
  variables: Record<string, unknown>;
  updateQuery: (previousResult: any, options: { fetchMoreResult: any }) => any;
};

describe("PaginatedQuery", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
  });

  it("handles offset pagination for nodes queries", async () => {
    const fetchMoreMock = vi.fn((_arg: FetchMoreArg) => Promise.resolve({}));
    useQueryMock.mockReturnValue({
      loading: false,
      error: null,
      data: { nodes: [{ id: 1 }] },
      fetchMore: fetchMoreMock,
      networkStatus: 7,
    });

    const query = {
      definitions: [
        {
          kind: "OperationDefinition",
          operation: "query",
          name: { kind: "Name", value: "Nodes" },
          selectionSet: {
            kind: "SelectionSet",
            selections: [{ kind: "Field", name: { kind: "Name", value: "nodes" } }],
          },
        },
      ],
    } as any;

    let renderProps: any;
    render(
      <PaginatedQuery query={query} variables={{}}>
        {(props) => {
          renderProps = props;
          return <div>child</div>;
        }}
      </PaginatedQuery>
    );

    await waitFor(() => {
      expect(renderProps).toBeTruthy();
    });

    expect(useQueryMock).toHaveBeenCalledWith(
      query,
      expect.objectContaining({
        variables: expect.objectContaining({ offset: 0, pattern: "" }),
      })
    );

    await act(async () => {
      renderProps.fetchMore({
        target: { scrollHeight: 100, scrollTop: 99, clientHeight: 0 },
      } as any);
    });

    expect(fetchMoreMock).toHaveBeenCalledTimes(1);
    const fetchMoreArg = fetchMoreMock.mock.calls[0]?.[0];
    expect(fetchMoreArg).toBeDefined();
    if (!fetchMoreArg) throw new Error("missing fetchMore call");
    expect(fetchMoreArg.variables).toEqual({ offset: 1, pattern: "" });

    const merged = fetchMoreArg.updateQuery(
      { nodes: [{ id: 1 }] },
      { fetchMoreResult: { nodes: [{ id: 2 }] } }
    );
    expect(merged.nodes).toEqual([{ id: 1 }, { id: 2 }]);

    const unchanged = fetchMoreArg.updateQuery(
      { nodes: [{ id: 1 }, { id: 99 }] },
      { fetchMoreResult: { nodes: [{ id: 2 }] } }
    );
    expect(unchanged).toEqual({ nodes: [{ id: 1 }, { id: 99 }] });
  });

  it("handles connection pagination and merged edges", async () => {
    const fetchMoreMock = vi.fn((_arg: FetchMoreArg) => Promise.resolve({}));
    const onCompleted = vi.fn();
    useQueryMock.mockReturnValue({
      loading: false,
      error: null,
      data: {
        issueList: {
          edges: [{ node: { number: "1" } }],
          pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
        },
      },
      fetchMore: fetchMoreMock,
      networkStatus: 7,
    });

    const query = {
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
    } as any;

    let renderProps: any;
    render(
      <PaginatedQuery query={query} variables={{ first: 25 }} onCompleted={onCompleted}>
        {(props) => {
          renderProps = props;
          return <div>child</div>;
        }}
      </PaginatedQuery>
    );

    await waitFor(() => {
      expect(renderProps).toBeTruthy();
      expect(onCompleted).toHaveBeenCalled();
    });

    await act(async () => {
      renderProps.fetchMore({
        target: { scrollHeight: 100, scrollTop: 99, clientHeight: 0 },
      } as any);
    });

    const fetchMoreArg = fetchMoreMock.mock.calls[0]?.[0];
    expect(fetchMoreArg).toBeDefined();
    if (!fetchMoreArg) throw new Error("missing fetchMore call");
    expect(fetchMoreArg.variables).toEqual({ first: 25, after: "cursor-1" });

    const merged = fetchMoreArg.updateQuery(
      {
        issueList: {
          edges: [{ node: { number: "1" } }],
          pageInfo: { hasNextPage: true, endCursor: "cursor-1" },
        },
      },
      {
        fetchMoreResult: {
          issueList: {
            edges: [{ node: { number: "2" } }],
            pageInfo: { hasNextPage: false, endCursor: "cursor-2" },
          },
        },
      }
    );

    expect(merged.issueList.edges).toHaveLength(2);
    expect(merged.issueList.pageInfo).toEqual({ hasNextPage: false, endCursor: "cursor-2" });
  });
});
