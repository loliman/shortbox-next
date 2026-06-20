import { scrapePaniniIssue, PANINI_DE_URL_PATTERN } from "./panini-scraper";

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

describe("PANINI_DE_URL_PATTERN", () => {
  it("should match panini.de/shp_deu_de/ URLs", () => {
    expect(
      PANINI_DE_URL_PATTERN.test(
        "https://www.panini.de/shp_deu_de/panini-pocket-spider-man-dmapoc025-de02.html"
      )
    ).toBe(true);
  });

  it("should match URLs without www", () => {
    expect(
      PANINI_DE_URL_PATTERN.test("https://panini.de/shp_deu_de/some-product.html")
    ).toBe(true);
  });

  it("should match http URLs", () => {
    expect(
      PANINI_DE_URL_PATTERN.test("http://www.panini.de/shp_deu_de/product.html")
    ).toBe(true);
  });

  it("should NOT match shp_aut_de URLs", () => {
    expect(
      PANINI_DE_URL_PATTERN.test("https://www.panini.de/shp_aut_de/product.html")
    ).toBe(false);
  });

  it("should NOT match arbitrary URLs", () => {
    expect(PANINI_DE_URL_PATTERN.test("https://marvel.com/something")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scrapePaniniIssue – invalid URLs (no network)
// ---------------------------------------------------------------------------

describe("scrapePaniniIssue – URL validation", () => {
  it("should return error for non-Panini URL", async () => {
    const result = await scrapePaniniIssue("https://example.com/product");
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it("should return error for empty string", async () => {
    const result = await scrapePaniniIssue("");
    expect(result.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// HTML parsing – tested via parseProductPage (indirectly via mock fetch)
// ---------------------------------------------------------------------------

jest.mock("undici", () => ({
  request: jest.fn(),
}));

import { request } from "undici";

const mockRequest = request as jest.MockedFunction<typeof request>;

function makeResponse(html: string, statusCode = 200) {
  return {
    statusCode,
    body: { text: async () => html },
  };
}

const VALID_URL =
  "https://www.panini.de/shp_deu_de/panini-pocket-spider-man-dmapoc025-de02.html";

function buildProductHtml(overrides: {
  title?: string;
  isbn?: string;
  seiten?: string;
  datum?: string;
  enthaelt?: string;
  autor?: string;
  zeichner?: string;
} = {}): string {
  const {
    title = "Spider-Man – Die Geschichte eines Lebens",
    isbn = "978-3-7416-4636-2",
    seiten = "232",
    datum = "30. Juni 2026",
    enthaelt = "Spider-Man: Life Story (2019) 1–6 & Annual",
    autor = "Chip Zdarsky",
    zeichner = "Mark Bagley",
  } = overrides;

  return `
    <html>
      <body>
        <h1 class="page-title"><span>${title}</span></h1>
        <table class="additional-attributes">
          <tbody>
            <tr><th>ISBN</th><td>${isbn}</td></tr>
            <tr><th>Seiten</th><td>${seiten}</td></tr>
            <tr><th>Erscheinungsdatum</th><td>${datum}</td></tr>
            <tr><th>Enthält</th><td>${enthaelt}</td></tr>
            <tr><th>Autor</th><td>${autor}</td></tr>
            <tr><th>Zeichner</th><td>${zeichner}</td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

describe("scrapePaniniIssue – HTML parsing", () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it("should parse title, isbn, pages, releasedate, containsRaw", async () => {
    mockRequest.mockResolvedValueOnce(makeResponse(buildProductHtml()) as never);

    const result = await scrapePaniniIssue(VALID_URL);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    const data = result.data!;
    expect(data.title).toBe("Spider-Man – Die Geschichte eines Lebens");
    expect(data.seriesTitle).toBe(data.title);
    expect(data.isbn).toBe("978-3-7416-4636-2");
    expect(data.pages).toBe(232);
    expect(data.releasedate).toBe("2026-06-30");
    expect(data.containsRaw).toBe("Spider-Man: Life Story (2019) 1–6 & Annual");
    expect(data.writer).toBe("Chip Zdarsky");
    expect(data.penciler).toBe("Mark Bagley");
  });

  it("should return error when title is missing", async () => {
    const html = `<html><body><table class="additional-attributes"><tr><th>ISBN</th><td>123</td></tr></table></body></html>`;
    mockRequest.mockResolvedValueOnce(makeResponse(html) as never);

    const result = await scrapePaniniIssue(VALID_URL);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it("should return error on 404", async () => {
    mockRequest.mockResolvedValueOnce(makeResponse("Not found", 404) as never);

    const result = await scrapePaniniIssue(VALID_URL);
    expect(result.error).toMatch(/404/);
    expect(result.data).toBeUndefined();
  });

  it("should return error on unexpected status code", async () => {
    mockRequest.mockResolvedValueOnce(makeResponse("Server error", 500) as never);

    const result = await scrapePaniniIssue(VALID_URL);
    expect(result.error).toBeDefined();
  });

  it("should parse German short date format (30.06.2026)", async () => {
    mockRequest.mockResolvedValueOnce(
      makeResponse(buildProductHtml({ datum: "30.06.2026" })) as never
    );

    const result = await scrapePaniniIssue(VALID_URL);
    expect(result.data?.releasedate).toBe("2026-06-30");
  });

  it("should parse ISO date format (2026-06-30)", async () => {
    mockRequest.mockResolvedValueOnce(
      makeResponse(buildProductHtml({ datum: "2026-06-30" })) as never
    );

    const result = await scrapePaniniIssue(VALID_URL);
    expect(result.data?.releasedate).toBe("2026-06-30");
  });

  it("should strip non-numeric characters from ISBN", async () => {
    mockRequest.mockResolvedValueOnce(
      makeResponse(buildProductHtml({ isbn: "ISBN: 978-3-7416-4636-2" })) as never
    );

    const result = await scrapePaniniIssue(VALID_URL);
    expect(result.data?.isbn).toBe("978-3-7416-4636-2");
  });

  it("should handle network errors gracefully", async () => {
    mockRequest.mockRejectedValueOnce(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));
    // Second attempt also fails (max 2 attempts, but ENOTFOUND is retryable only if attempt < max)
    mockRequest.mockRejectedValueOnce(Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" }));

    const result = await scrapePaniniIssue(VALID_URL);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });
});
