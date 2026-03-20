import { NextRequest, NextResponse } from "next/server";
import { getAdminTasks } from "@/src/lib/screens/admin-data";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitRuns = Number(searchParams.get("limitRuns") || 10);
  const items = await getAdminTasks(Number.isFinite(limitRuns) ? limitRuns : 10);

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
