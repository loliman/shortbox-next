import { NextResponse } from "next/server";
import { FilterService } from "@/src/services/FilterService";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    filter?: Record<string, unknown>;
    type?: string;
  };
  const type = body.type === "csv" ? "csv" : "txt";

  try {
    const service = new FilterService();
    const content = await service.export((body.filter || {}) as never, type, false);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: null }, { status: 500 });
  }
}
