import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { createIssue, deleteIssueByLookup, editIssue } from "@/src/lib/server/issues-write";
import { invalidateNavigationCache } from "@/src/lib/server/revalidate";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as { item?: Record<string, unknown> };
    const item = await createIssue(body.item || {});
    invalidateNavigationCache();
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ausgabe konnte nicht erstellt werden" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as {
      old?: Record<string, unknown>;
      item?: Record<string, unknown>;
    };
    const item = await editIssue(body.old || {}, body.item || {});
    invalidateNavigationCache();
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ausgabe konnte nicht gespeichert werden" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as { item?: Record<string, unknown> };
    const success = await deleteIssueByLookup(body.item || {});
    invalidateNavigationCache();
    return NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ausgabe konnte nicht gelöscht werden" },
      { status: 400 }
    );
  }
}
