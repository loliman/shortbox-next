import { NextResponse } from "next/server";
import { getPublisherScreenData } from "@/src/lib/screens/entity-details-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const publisher = searchParams.get("publisher") || "";

  try {
    const data = await getPublisherScreenData({ us, publisher });
    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ item: null });
  }
}
