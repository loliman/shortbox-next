import { NextRequest, NextResponse } from "next/server";
import {
  readNavigationFilterState,
  readNavigationIssues,
  readNavigationSeries,
} from "@/src/lib/read/navigation-read";
import { readServerSession } from "@/src/lib/server/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope");
    const us = searchParams.get("us") === "true";
    const filter = searchParams.get("filter");
    const session = await readServerSession();
    const filterState = await readNavigationFilterState(filter, Boolean(session?.loggedIn));

    if (scope === "series") {
      const publisher = (searchParams.get("publisher") || "").trim();
      if (!publisher) {
        return NextResponse.json({ error: "publisher fehlt" }, { status: 400 });
      }

      const items = await readNavigationSeries({
        us,
        publisher,
        directIssueWhere: filterState.directIssueWhere,
        filteredIssueIds: filterState.filteredIssueIds,
      });

      return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
    }

    if (scope === "issues") {
      const publisher = (searchParams.get("publisher") || "").trim();
      const series = (searchParams.get("series") || "").trim();
      const volume = Number(searchParams.get("volume") || "0");
      if (!publisher || !series || !Number.isFinite(volume)) {
        return NextResponse.json({ error: "publisher/series/volume fehlen" }, { status: 400 });
      }

      const items = await readNavigationIssues({
        us,
        publisher,
        series,
        volume,
        directIssueWhere: filterState.directIssueWhere,
        filteredIssueIds: filterState.filteredIssueIds,
      });

      return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Ungueltiger scope" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Navigation konnte nicht geladen werden" }, { status: 500 });
  }
}
