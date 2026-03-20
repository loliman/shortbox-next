import { NextResponse } from "next/server";
import { getIssueScreenData } from "@/src/lib/screens/issue-details-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publisher = searchParams.get("publisher") || "";
  const series = searchParams.get("series") || "";
  const volume = Number(searchParams.get("volume") || "1");
  const number = searchParams.get("number") || "";
  const format = searchParams.get("format");
  const variant = searchParams.get("variant");
  const us = searchParams.get("locale") === "us";

  try {
    const data = await getIssueScreenData({
      us,
      publisher,
      series,
      volume,
      number,
      format,
      variant,
    });

    return NextResponse.json({ item: data });
  } catch {
    return NextResponse.json({ item: null });
  }
}
