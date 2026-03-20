import { NextResponse } from "next/server";
import { getNavigationIssues } from "@/src/lib/screens/navigation-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publisher = searchParams.get("publisher") || "";
  const series = searchParams.get("series") || "";
  const volume = Number(searchParams.get("volume") || "1");
  const us = searchParams.get("locale") === "us";
  const filter = searchParams.get("filter");

  try {
    const data = await getNavigationIssues({ us, filter, publisher, series, volume });
    return NextResponse.json({ items: data });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
