import { NextRequest, NextResponse } from "next/server";
import { deleteIssueByLookup } from "@/src/lib/server/issues-write";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { item?: Record<string, unknown> };
    const item = normalizeIssueStubItem(body.item || {});
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
    const body = (await request.json()) as {
      old?: Record<string, unknown>;
      item?: Record<string, unknown>;
    };
    const item = normalizeIssueStubItem(body.item || body.old || {});
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
    const body = (await request.json()) as { item?: Record<string, unknown> };
    const success = await deleteIssueByLookup(body.item || {});
    return NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ausgabe konnte nicht gelöscht werden" },
      { status: 400 }
    );
  }
}

function normalizeIssueStubItem(item: Record<string, unknown>) {
  const series = asRecord(item.series) || {};
  const publisher = asRecord(series.publisher) || {};

  return {
    ...item,
    id: String(item.id || "0"),
    title: String(item.title || ""),
    number: String(item.number || ""),
    format: String(item.format || ""),
    variant: String(item.variant || ""),
    addinfo: String(item.addinfo || ""),
    releasedate: item.releasedate ? String(item.releasedate) : "",
    series: {
      ...series,
      title: String(series.title || ""),
      volume: Number(series.volume || 0),
      publisher: {
        ...publisher,
        name: String(publisher.name || ""),
        us: Boolean(publisher.us),
      },
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
