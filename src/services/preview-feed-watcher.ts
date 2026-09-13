export interface DetectedPreview {
  previewNumber: number;
  title: string;
  pdfUrl: string;
  articleUrl?: string;
}

const FEED_URL = "https://comicfreunde.de/feed/";

export async function fetchLatestPreviewInfo(): Promise<DetectedPreview | null> {
  const response = await fetch(FEED_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Shortbox Panini Watcher/1.0)",
      Accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed-Abruf fehlgeschlagen mit Status ${response.status}`);
  }

  const xmlText = await response.text();
  return parsePreviewFromFeedXml(xmlText);
}

export function parsePreviewFromFeedXml(xmlText: string): DetectedPreview | null {
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  for (const item of itemMatches) {
    const titleMatch = item.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/&#8211;/g, "–").trim() : "";

    if (!/panini\s*vorschau/i.test(title)) continue;

    const numMatch = title.match(/panini\s*vorschau\s*(\d+)/i);
    if (!numMatch) continue;

    const previewNumber = parseInt(numMatch[1], 10);
    const pdfMatch = item.match(/href=["'](https?:\/\/[^"']+\.pdf)["']/i);
    if (!pdfMatch) continue;

    const linkMatch = item.match(/<link>(.*?)<\/link>/i);

    return {
      previewNumber,
      title,
      pdfUrl: pdfMatch[1],
      articleUrl: linkMatch ? linkMatch[1].trim() : undefined,
    };
  }

  return null;
}
