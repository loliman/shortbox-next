import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { createSeries, deleteSeriesByLookup, editSeries } from "@/src/lib/server/series-write";
import { invalidateNavigationCache } from "@/src/lib/server/revalidate";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as { item?: Record<string, unknown> };
    const item = await createSeries(body.item || {});
    invalidateNavigationCache();
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Serie konnte nicht erstellt werden" },
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
    const item = await editSeries(body.old || {}, body.item || {});
    invalidateNavigationCache();
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Serie konnte nicht gespeichert werden" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as { item?: Record<string, unknown> };
    const success = await deleteSeriesByLookup(body.item || {});
    invalidateNavigationCache();
    return NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Serie konnte nicht gelöscht werden" },
      { status: 400 }
    );
  }
}
