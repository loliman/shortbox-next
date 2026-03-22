import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logoutUser } from "@/src/lib/server/auth-write";
import { prisma } from "@/src/lib/prisma/client";
import { SESSION_COOKIE_NAME } from "@/src/lib/server/session";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let userId: string | null = null;

  if (sessionId) {
    const user = await prisma.user.findFirst({
      where: {
        sessionId,
      },
      select: {
        id: true,
      },
    });
    userId = user ? String(user.id) : null;
  }

  const success = await logoutUser(userId);
  const response = NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
