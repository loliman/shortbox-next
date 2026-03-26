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

  it("unwraps disallowed server-side tags and strips non-blank link attrs", () => {
    const html = sanitizeHtml('<span><a href="/issues/1" target="_self" rel="noopener">Link</a></span>');

    expect(html).not.toContain("<span");
    expect(html).toContain('<a href="/issues/1">Link</a>');
    expect(html).not.toContain("target=");
    expect(html).not.toContain('rel="noopener"');
  });
});
