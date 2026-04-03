import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "../prisma/client";
import type { SessionData } from "../../types/session";

export const SESSION_COOKIE_NAME = "shortbox_session";

function createSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function getSessionCookieOptions() {
  return createSessionCookieOptions();
}

export const readSessionBySessionId = cache(
  async (sessionId: string | null | undefined): Promise<SessionData | null> => {
    const normalizedSessionId = readTextValue(sessionId);
    if (!normalizedSessionId) return null;

    const user = await prisma.user.findFirst({
      where: {
        sessionId: normalizedSessionId,
      },
      select: {
        id: true,
        name: true,
        sessionId: true,
      },
    });

    if (!user?.sessionId) return null;

    return {
      loggedIn: true,
      userId: String(user.id),
      userName: readTextValue(user.name),
      canWrite: true,
      canAdmin: true,
    };
  }
);

export const readServerSession = cache(async (): Promise<SessionData | null> => {
  const cookieStore = await cookies();
  return readSessionBySessionId(cookieStore.get(SESSION_COOKIE_NAME)?.value);
});

function readTextValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return "";
}
