import { NextRequest, NextResponse } from "next/server";
import { getChangeRequests } from "@/src/lib/screens/change-requests-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const items = await getChangeRequests({
    order: searchParams.get("order"),
    direction: searchParams.get("direction"),
  });

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
