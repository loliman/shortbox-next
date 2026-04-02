import { NextRequest, NextResponse } from "next/server";
import { getSelected } from "@/src/lib/routes/hierarchy";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { resolveNavigationFilterQuery } from "@/src/lib/routes/seo-filter-navigation";
import { isSeoFilterKind } from "@/src/lib/routes/seo-filter-route";
import { readServerSession } from "@/src/lib/server/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const us = searchParams.get("us") === "true";
    const routeFilterKind = searchParams.get("routeFilterKind");
    const routeFilterSlug = searchParams.get("routeFilterSlug");
    const hasRouteFilter = isSeoFilterKind(routeFilterKind) && Boolean(routeFilterSlug);
    const selected = hasRouteFilter
      ? { us }
      : getSelected(
          {
            publisher: searchParams.get("publisher") || undefined,
            series: searchParams.get("series") || undefined,
            issue: searchParams.get("issue") || undefined,
            format: searchParams.get("format") || undefined,
            variant: searchParams.get("variant") || undefined,
          },
          us
        );
    const resolvedFilterQuery = await resolveNavigationFilterQuery({
      us,
      filter: searchParams.get("filter"),
      routeFilterKind,
      routeFilterSlug,
    });
    const session = await readServerSession();
    const data = await readInitialNavigationData({
      us,
      selected,
      query: resolvedFilterQuery ? { filter: resolvedFilterQuery } : null,
      loggedIn: Boolean(session?.loggedIn),
    });

    return NextResponse.json(
      {
        ...data,
        resolvedFilterQuery,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Navigation konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}
