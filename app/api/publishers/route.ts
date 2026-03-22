import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { createPublisher, deletePublisherByLookup, editPublisher } from "@/src/lib/server/publishers-write";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as { item?: Record<string, unknown> };
    const item = await createPublisher(body.item || {});
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publisher konnte nicht erstellt werden" },
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
    const item = await editPublisher(body.old || {}, body.item || {});
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publisher konnte nicht gespeichert werden" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const body = (await request.json()) as { item?: Record<string, unknown> };
    const success = await deletePublisherByLookup(body.item || {});
    return NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publisher konnte nicht gelöscht werden" },
      { status: 400 }
    );
  }
}
