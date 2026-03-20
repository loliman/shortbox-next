import { NextRequest, NextResponse } from "next/server";
import { IssueService } from "@/src/services/IssueService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const items = await new IssueService().listChangeRequests({
      order: searchParams.get("order") || undefined,
      direction: searchParams.get("direction") || undefined,
    });

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { items: [] },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
