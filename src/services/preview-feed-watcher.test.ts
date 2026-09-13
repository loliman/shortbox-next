import { parsePreviewFromFeedXml } from "./preview-feed-watcher";

describe("preview-feed-watcher", () => {
  it("should_extractLatestPreview_when_validFeedXmlProvided", () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <item>
            <title>Panini Vorschau 123 &#8211; Oktober bis Dezember 2026</title>
            <link>https://comicfreunde.de/panini-vorschau-123/</link>
            <content:encoded><![CDATA[
              <p><a href="https://comicfreunde.de/wp-content/uploads/2026/09/Panini-Vorschau-123.pdf">PDF</a></p>
            ]]></content:encoded>
          </item>
        </channel>
      </rss>
    `;

    const result = parsePreviewFromFeedXml(xml);
    expect(result).not.toBeNull();
    expect(result?.previewNumber).toBe(123);
    expect(result?.title).toContain("Panini Vorschau 123");
    expect(result?.pdfUrl).toBe("https://comicfreunde.de/wp-content/uploads/2026/09/Panini-Vorschau-123.pdf");
    expect(result?.articleUrl).toBe("https://comicfreunde.de/panini-vorschau-123/");
  });

  it("should_returnNull_when_noPreviewItemInFeed", () => {
    const xml = `
      <rss version="2.0">
        <channel>
          <item>
            <title>Andere Comic-News</title>
            <link>https://comicfreunde.de/news/</link>
          </item>
        </channel>
      </rss>
    `;

    const result = parsePreviewFromFeedXml(xml);
    expect(result).toBeNull();
  });
});
