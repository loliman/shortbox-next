import { NextResponse } from "next/server";
import { PublisherService } from "@/src/services/PublisherService";
import { parseFilter } from "@/src/components/nav-bar/listUtils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const us = searchParams.get("locale") === "us";
  const pattern = searchParams.get("pattern") || undefined;
  const filter = searchParams.get("filter");

  try {
    const service = new PublisherService();
    const connection = await service.findPublishers(
      pattern,
      us,
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
