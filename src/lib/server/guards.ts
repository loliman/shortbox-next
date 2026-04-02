import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { readServerSession } from "./session";
import type { SessionData } from "../../types/session";

export async function requireServerSession() {
  const session = await readServerSession();
  if (!session?.loggedIn) return null;
  return session;
}

function hasWriteAccess(session: SessionData | null) {
  return Boolean(session?.loggedIn && session?.canWrite);
}

function hasAdminAccess(session: SessionData | null) {
  return Boolean(session?.loggedIn && session?.canAdmin);
}

function buildUnauthorizedApiResponse(status: 401 | 403, error: string) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function requirePageSession() {
  const session = await requireServerSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireApiSession() {
  const session = await requireServerSession();
  if (!session) {
    return {
      session: null,
      response: buildUnauthorizedApiResponse(401, "Nicht autorisiert"),
    } as const;
  }

  return {
    session,
    response: null,
  } as const;
}

export async function requireWriteServerSession() {
  const session = await requireServerSession();
  if (!hasWriteAccess(session)) return null;
  return session;
}

export async function requireAdminServerSession() {
  const session = await requireServerSession();
  if (!hasAdminAccess(session)) return null;
  return session;
}

export async function requirePageWriteSession() {
  const session = await requireServerSession();
  if (!session) redirect("/login");
  if (!hasWriteAccess(session)) redirect("/de");
  return session;
}

export async function requirePageAdminSession() {
  const session = await requireServerSession();
  if (!session) redirect("/login");
  if (!hasAdminAccess(session)) redirect("/de");
  return session;
}

export async function requireApiWriteSession() {
  const auth = await requireApiSession();
  if (auth.response) return auth;
  if (!hasWriteAccess(auth.session)) {
    return {
      session: auth.session,
      response: buildUnauthorizedApiResponse(403, "Keine Berechtigung für Schreibzugriffe"),
    } as const;
  }

  return auth;
}

export async function requireApiAdminSession() {
  const auth = await requireApiSession();
  if (auth.response) return auth;
  if (!hasAdminAccess(auth.session)) {
    return {
      session: auth.session,
      response: buildUnauthorizedApiResponse(403, "Keine Berechtigung für Admin-Aktionen"),
    } as const;
  }

  return auth;
}
