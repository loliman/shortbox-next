import { vi } from "vitest";
import { sanitizeHtml } from "./sanitizeHtml";

describe("sanitizeHtml", () => {
  it("returns empty string for empty input", () => {
    expect(sanitizeHtml("")).toBe("");
    expect(sanitizeHtml(null)).toBe("");
    expect(sanitizeHtml(undefined)).toBe("");
  });

  it("sanitizes scripts and hardens target=_blank links", () => {
    const html = sanitizeHtml(
      '<script>alert(1)</script><a href="https://example.com" target="_blank">Link</a>'
    );

    expect(html).not.toContain("<script>");
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
  });

  it("removes disallowed attributes", () => {
    const html = sanitizeHtml('<a href="https://example.com" data-foo="bar">Link</a>');
    expect(html).not.toContain("data-foo");
    expect(html).toContain('href="https://example.com"');
  });

  it("escapes HTML in non-browser context", () => {
    vi.stubGlobal("window", undefined);
    const escaped = sanitizeHtml("<b>\"x\"&'y'</b>");
    vi.unstubAllGlobals();

    expect(escaped).toBe("&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/b&gt;");
  });
});
