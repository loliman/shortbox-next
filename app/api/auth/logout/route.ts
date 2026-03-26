import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logoutUserBySessionId } from "@/src/lib/server/auth-write";
import { SESSION_COOKIE_NAME } from "@/src/lib/server/session";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const success = await logoutUserBySessionId(sessionId);
  const response = NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
