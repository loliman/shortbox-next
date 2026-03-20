import { NextResponse } from "next/server";
import { SeriesService } from "@/src/services/SeriesService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const publisher = searchParams.get("publisher") || "";
  const series = searchParams.get("series") || "";
  const volume = Number(searchParams.get("volume") || "1");

  try {
    const service = new SeriesService();
    const data = await service.getSeriesDetails({ us, publisher, series, volume });
    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ item: null });
  }
}
