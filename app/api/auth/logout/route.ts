import { NextResponse } from "next/server";
import { logoutUser } from "@/src/lib/server/auth-write";

export async function POST() {
  const success = await logoutUser();
  return NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
}
