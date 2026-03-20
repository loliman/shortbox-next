import { NextResponse } from "next/server";
import { FilterService } from "@/src/services/FilterService";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    filter?: Record<string, unknown>;
  };

  try {
    const service = new FilterService();
    const count = await service.count((body.filter || {}) as never, false);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
