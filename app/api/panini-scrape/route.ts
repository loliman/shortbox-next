import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { scrapePaniniIssue, PANINI_DE_URL_PATTERN } from "@/src/services/panini-scraper";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const url = typeof rawBody?.url === "string" ? rawBody.url.trim() : "";

    if (!url) {
      return NextResponse.json({ error: "URL fehlt." }, { status: 400 });
    }

    if (!PANINI_DE_URL_PATTERN.test(url)) {
      return NextResponse.json(
        { error: "Ungültige URL. Nur panini.de/shp_deu_de/-Links werden unterstützt." },
        { status: 400 }
      );
    }

    const result = await scrapePaniniIssue(url);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ data: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Panini-Import fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
