import { NextResponse } from "next/server";
import { getNavigationSeries } from "@/src/lib/screens/navigation-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publisher = searchParams.get("publisher") || "";
  const us = searchParams.get("locale") === "us";
  const filter = searchParams.get("filter");

  try {
    const data = await getNavigationSeries({ us, filter, publisher });
    return NextResponse.json({ items: data });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
