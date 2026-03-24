import { NextRequest, NextResponse } from "next/server";
import {
  type NavigationIssuesScope,
  readNavigationFilterState,
  readNavigationIssues,
  readNavigationSeries,
} from "@/src/lib/read/navigation-read";
import { resolveNavigationFilterQuery } from "@/src/lib/routes/seo-filter-navigation";
import { readServerSession } from "@/src/lib/server/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope");
    const us = searchParams.get("us") === "true";
    const filter = await resolveNavigationFilterQuery({
      us,
      filter: searchParams.get("filter"),
      routeFilterKind: searchParams.get("routeFilterKind"),
      routeFilterSlug: searchParams.get("routeFilterSlug"),
    });
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
      const startyear = Number(searchParams.get("startyear") || "0") || undefined;
      if (!publisher || !series || !Number.isFinite(volume)) {
        return NextResponse.json({ error: "publisher/series/volume fehlen" }, { status: 400 });
      }

      const issueScope: NavigationIssuesScope = {
        us,
        publisher,
        series,
        volume,
        startyear,
        directIssueWhere: filterState.directIssueWhere,
        filteredIssueIds: filterState.filteredIssueIds,
      };

      const items = await readNavigationIssues(issueScope);

      return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Ungueltiger scope" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Navigation konnte nicht geladen werden" }, { status: 500 });
  }
}
