/** @jest-environment jsdom */
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAutocompleteQuery } from "./useAutocompleteQuery";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useAutocompleteQuery", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it("ignores stale results from older autocomplete requests", async () => {
    const firstRequest = createDeferred<{
      ok: boolean;
      json: () => Promise<{ items: Array<{ name: string }>; hasMore: boolean }>;
    }>();
    const secondRequest = createDeferred<{
      ok: boolean;
      json: () => Promise<{ items: Array<{ name: string }>; hasMore: boolean }>;
    }>();

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);

    const { result, rerender } = renderHook(
      ({ pattern }) =>
        useAutocompleteQuery<{ name: string }>({
          source: "publishers",
          variables: { pattern },
          searchText: pattern,
          minQueryLength: 1,
          debounceMs: 50,
        }),
      {
        initialProps: {
          pattern: "Pa",
        },
      }
    );

    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    rerender({ pattern: "Pan" });

    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    await act(async () => {
      secondRequest.resolve({
        ok: true,
        json: async () => ({
          items: [{ name: "Panini - Marvel & Icon" }],
          hasMore: false,
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.options).toEqual([{ name: "Panini - Marvel & Icon" }]);
    });

    await act(async () => {
      firstRequest.resolve({
        ok: true,
        json: async () => ({
          items: [{ name: "Pacific Comics" }],
          hasMore: false,
        }),
      });
    });

    await waitFor(() => {
      expect(result.current.options).toEqual([{ name: "Panini - Marvel & Icon" }]);
    });
  });
});
