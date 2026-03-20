import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ count: 0 });
}
