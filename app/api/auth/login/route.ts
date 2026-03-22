import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/src/lib/server/auth-write";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/src/lib/server/session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      credentials?: { name?: string; password?: string };
    };

    const user = await loginUser(body.credentials || {});
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          userId: user.userId,
          loggedIn: true,
          userName: user.userName,
          canWrite: user.canWrite,
          canAdmin: user.canAdmin,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
    if (user.sessionId) {
      response.cookies.set(SESSION_COOKIE_NAME, user.sessionId, getSessionCookieOptions());
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login fehlgeschlagen" },
      { status: 400 }
    );
  }
}
