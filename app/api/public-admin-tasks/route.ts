import { NextRequest, NextResponse } from "next/server";
import { readAdminTasks } from "@/src/lib/read/admin-read";
import { requireApiAdminSession } from "@/src/lib/server/guards";

export async function GET(request: NextRequest) {
  const auth = await requireApiAdminSession();
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const limitRuns = Number(searchParams.get("limitRuns") || 10);
  try {
    const items = await readAdminTasks(Number.isFinite(limitRuns) ? limitRuns : 10);

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
