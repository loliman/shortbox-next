/** @jest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { LARGE_BRANCH_CHUNK_SIZE } from "./branchWindowing";
import { useBranchWindowing } from "./useBranchWindowing";

describe("useBranchWindowing", () => {
  let requestAnimationFrameSpy: jest.SpyInstance<number, [FrameRequestCallback]>;
  let cancelAnimationFrameSpy: jest.SpyInstance<void, [number]>;
  let callbacks: FrameRequestCallback[];

  beforeEach(() => {
    callbacks = [];
    requestAnimationFrameSpy = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callbacks.push(callback);
        return callbacks.length;
      });
    cancelAnimationFrameSpy = jest
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it("should_when_progressiveRenderingDeferred_then_waitUntilReleased", () => {
    const { result, rerender } = renderHook(
      ({ deferProgressiveRendering }) =>
        useBranchWindowing(500, null, deferProgressiveRendering),
      {
        initialProps: {
          deferProgressiveRendering: true,
        },
      }
    );

    expect(result.current.windowStart).toBe(0);
    expect(result.current.windowEnd).toBe(LARGE_BRANCH_CHUNK_SIZE);
    expect(result.current.visibleCount).toBe(LARGE_BRANCH_CHUNK_SIZE);
    expect(callbacks).toHaveLength(0);

    rerender({ deferProgressiveRendering: false });

    expect(callbacks).toHaveLength(1);

    act(() => {
      const callback = callbacks.shift();
      callback?.(0);
    });

    expect(result.current.windowStart).toBe(0);
    expect(result.current.windowEnd).toBeGreaterThan(LARGE_BRANCH_CHUNK_SIZE);
    expect(result.current.visibleCount).toBeGreaterThan(LARGE_BRANCH_CHUNK_SIZE);
  });

  it("should_when_selectedIndexIsPresent_then_keepInitialSelectedWindowStable", () => {
    const { result } = renderHook(() => useBranchWindowing(500, 220, false));

    expect(result.current.windowStart).toBe(161);
    expect(result.current.windowEnd).toBe(281);
    expect(result.current.visibleCount).toBe(LARGE_BRANCH_CHUNK_SIZE);
  });
});
