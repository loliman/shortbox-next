import { NextResponse } from "next/server";
import { getNavigationPublishers } from "@/src/lib/screens/navigation-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const filter = searchParams.get("filter");

  const data = await getNavigationPublishers({ us, filter });
  return NextResponse.json({ items: data });
}
