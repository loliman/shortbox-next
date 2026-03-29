import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/src/lib/server/auth-write";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/src/lib/server/session";
import { LoginSchema } from "@/src/util/yupSchema";
import * as Yup from "yup";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const credentials = await LoginSchema.validate(rawBody?.credentials, {
      stripUnknown: true,
    });

    const user = await loginUser(credentials);
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
    if (error instanceof Yup.ValidationError) {
      return NextResponse.json({ error: error.errors.join(", ") }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login fehlgeschlagen" },
      { status: 400 }
    );
  }
}
