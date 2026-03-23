import { NextRequest, NextResponse } from "next/server";
import { getSelected } from "@/src/util/hierarchy";
import { readInitialNavigationData } from "@/src/lib/read/navigation-read";
import { readServerSession } from "@/src/lib/server/session";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const us = searchParams.get("us") === "true";
    const selected = getSelected(
      {
        publisher: searchParams.get("publisher") || undefined,
        series: searchParams.get("series") || undefined,
        issue: searchParams.get("issue") || undefined,
        variant: searchParams.get("variant") || undefined,
      },
      us
    );
    const filter = searchParams.get("filter");
    const session = await readServerSession();
    const data = await readInitialNavigationData({
      us,
      selected,
      query: filter ? { filter } : null,
      loggedIn: Boolean(session?.loggedIn),
    });

    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "Navigation konnte nicht geladen werden" },
      { status: 500 }
    );
  }
}
