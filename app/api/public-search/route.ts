import { NextResponse } from "next/server";
import { findPublicSearchNodes } from "@/src/lib/search/public-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const pattern = (searchParams.get("pattern") || "").trim();
  const offset = Number(searchParams.get("offset") || "0");

  if (pattern.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await findPublicSearchNodes({
      pattern,
      us,
      offset: Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0,
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
