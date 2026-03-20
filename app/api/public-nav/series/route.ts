import { NextResponse } from "next/server";
import { SeriesService } from "@/src/services/SeriesService";
import { parseFilter } from "@/src/components/nav-bar/listUtils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publisher = searchParams.get("publisher") || "";
  const pattern = searchParams.get("pattern") || undefined;
  const us = searchParams.get("locale") === "us";
  const filter = searchParams.get("filter");

  try {
    const service = new SeriesService();
    const connection = await service.findSeries(
      pattern,
      { name: publisher, us },
      undefined,
      undefined,
      false,
      parseFilter(filter)
    );
    return NextResponse.json({
      items: connection.edges.map((edge) => edge?.node).filter(Boolean),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
