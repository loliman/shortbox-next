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

describe("previewNavigation", () => {
  it("handles plain primary clicks", () => {
    expect(shouldHandlePreviewNavigation(createEvent())).toBe(true);
  });

  it("ignores modified clicks and non-primary buttons", () => {
    expect(shouldHandlePreviewNavigation(createEvent({ metaKey: true }))).toBe(false);
    expect(shouldHandlePreviewNavigation(createEvent({ ctrlKey: true }))).toBe(false);
    expect(shouldHandlePreviewNavigation(createEvent({ button: 1 }))).toBe(false);
  });
});
