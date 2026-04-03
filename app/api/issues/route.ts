import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { createIssue, createIssueBatch, deleteIssueByLookup, editIssue } from "@/src/lib/server/issues-write";
import { invalidateNavigationCache } from "@/src/lib/server/revalidate";
import * as Yup from "yup";
import { validateCreateIssueBody, validateDeleteIssueBody, validateEditIssueBody } from "@/src/lib/api/issue-body";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await validateCreateIssueBody(rawBody);

    const result = body.batch
      ? await createIssueBatch((body.item as never) || ({} as never), body.batch)
      : await createIssue((body.item as never) || ({} as never));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    invalidateNavigationCache();
    const items = "items" in result.data ? result.data.items : [result.data.item];
    return NextResponse.json(
      {
        item: items[items.length - 1],
        items,
        ...("meta" in result.data && result.data.meta ? { meta: result.data.meta } : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Ausgabe konnte nicht erstellt werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await validateEditIssueBody(rawBody);

    const result = await editIssue((body.old as never) || ({} as never), (body.item as never) || ({} as never));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    invalidateNavigationCache();
    return NextResponse.json(
      {
        item: result.data.item,
        ...(result.data.meta ? { meta: result.data.meta } : {}),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Ausgabe konnte nicht gespeichert werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await validateDeleteIssueBody(rawBody);

    const result = await deleteIssueByLookup((body.item as never) || ({} as never));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    invalidateNavigationCache();
    return NextResponse.json({ success: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Ausgabe konnte nicht gelöscht werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
