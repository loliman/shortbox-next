import { NextResponse } from "next/server";
import { getSeriesScreenData } from "@/src/lib/screens/entity-details-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const publisher = searchParams.get("publisher") || "";
  const series = searchParams.get("series") || "";
  const volume = Number(searchParams.get("volume") || "1");

  const data = await getSeriesScreenData({ us, publisher, series, volume });
  return NextResponse.json({ item: data });
}
