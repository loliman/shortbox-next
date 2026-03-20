import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { type?: string };
  const type = body.type === "csv" ? "csv" : "txt";

  const content =
    type === "csv"
      ? "publisher,series,number\n"
      : "Export ist aktuell noch nicht implementiert.\n";

  return NextResponse.json({ content });
}
