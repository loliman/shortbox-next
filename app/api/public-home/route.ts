import { NextResponse } from "next/server";
import { getHomePageData } from "@/src/lib/screens/home-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const offset = Number(searchParams.get("offset") || "0");
  const limit = Number(searchParams.get("limit") || "50");
  const order = searchParams.get("order");
  const direction = searchParams.get("direction");

  try {
    const data = await getHomePageData({
      us,
      offset,
      limit,
      order,
      direction,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [], hasMore: false });
  }
}
