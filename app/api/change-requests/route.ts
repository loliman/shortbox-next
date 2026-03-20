import { NextRequest, NextResponse } from "next/server";
import {
  createIssueChangeRequest,
  discardChangeRequestById,
} from "@/src/lib/server/change-requests-write";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      issue?: Record<string, unknown>;
      item?: Record<string, unknown>;
    };
    const item = await createIssueChangeRequest({
      issue: body.issue,
      item: body.item,
    });
    return NextResponse.json({ item }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Change Request konnte nicht erstellt werden",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string | number };
    const success = await discardChangeRequestById(body.id);
    return NextResponse.json({ success }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Change Request konnte nicht verworfen werden",
      },
      { status: 400 }
    );
  }
}
