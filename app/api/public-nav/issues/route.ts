import { NextResponse } from "next/server";
import { IssueService } from "@/src/services/IssueService";
import { parseFilter } from "@/src/components/nav-bar/listUtils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publisher = searchParams.get("publisher") || "";
  const series = searchParams.get("series") || "";
  const volume = Number(searchParams.get("volume") || "1");
  const pattern = searchParams.get("pattern") || undefined;
  const us = searchParams.get("locale") === "us";
  const filter = searchParams.get("filter");

  try {
    const service = new IssueService();
    const connection = await service.findIssues(
      pattern,
      {
        title: series,
        volume,
        publisher: {
          name: publisher,
          us,
        },
      },
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
