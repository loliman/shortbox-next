import { NextRequest, NextResponse } from "next/server";
import { readChangeRequests } from "@/src/lib/read/issue-read";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const items = await readChangeRequests({
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
