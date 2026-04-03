import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { createSeries, deleteSeriesByLookup, editSeries } from "@/src/lib/server/series-write";
import { invalidateNavigationCache } from "@/src/lib/server/revalidate";
import { SeriesSchema } from "@/src/util/yupSchema";
import * as Yup from "yup";

async function validateSeriesRequestBody(
  rawBody: unknown,
  options?: Readonly<{ requireOld?: boolean }>
) {
  const body = (rawBody && typeof rawBody === "object" ? rawBody : {}) as {
    item?: unknown;
    old?: unknown;
  };

  const item = await SeriesSchema.validate(body.item || {}, { stripUnknown: true });
  const old = options?.requireOld
    ? await SeriesSchema.validate(body.old || {}, { stripUnknown: true })
    : body.old
      ? await SeriesSchema.validate(body.old, { stripUnknown: true })
      : undefined;

  return { item, old };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await validateSeriesRequestBody(rawBody);

    const result = await createSeries((body.item as never) || ({} as never));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    invalidateNavigationCache();
    return NextResponse.json({ item: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Serie konnte nicht erstellt werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await validateSeriesRequestBody(rawBody, { requireOld: true });

    const result = await editSeries((body.old as never) || ({} as never), (body.item as never) || ({} as never));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    invalidateNavigationCache();
    return NextResponse.json({ item: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Serie konnte nicht gespeichert werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await validateSeriesRequestBody(rawBody);

    const result = await deleteSeriesByLookup((body.item as never) || ({} as never));
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    invalidateNavigationCache();
    return NextResponse.json({ success: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Serie konnte nicht gelöscht werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
