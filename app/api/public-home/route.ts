import { NextResponse } from "next/server";
import { getHomePageData } from "@/src/lib/screens/home-data";
import { parseFilter } from "@/src/components/nav-bar/listUtils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const offset = Number(searchParams.get("offset") || "0");
  const limit = Number(searchParams.get("limit") || "50");
  const order = searchParams.get("order");
  const direction = searchParams.get("direction");
  const filter = parseFilter(searchParams.get("filter"));

  try {
    const data = await getHomePageData({
      us,
      offset,
      limit,
      order,
      direction,
      filter,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [], hasMore: false });
  }
}
