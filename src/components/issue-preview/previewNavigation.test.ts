import test from "node:test";
import assert from "node:assert/strict";
import { shouldHandlePreviewNavigation } from "./previewNavigation";

function createEvent(overrides: Partial<React.MouseEvent<HTMLElement>> = {}) {
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  } as React.MouseEvent<HTMLElement>;
}

test("handles plain primary clicks", () => {
  assert.equal(shouldHandlePreviewNavigation(createEvent()), true);
});

test("ignores modified clicks and non-primary buttons", () => {
  assert.equal(shouldHandlePreviewNavigation(createEvent({ metaKey: true })), false);
  assert.equal(shouldHandlePreviewNavigation(createEvent({ ctrlKey: true })), false);
  assert.equal(shouldHandlePreviewNavigation(createEvent({ button: 1 })), false);
});
