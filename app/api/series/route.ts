import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { createSeries, deleteSeriesByLookup, editSeries } from "@/src/lib/server/series-write";
import { invalidateNavigationCache } from "@/src/lib/server/revalidate";
import { SeriesSchema } from "@/src/util/yupSchema";
import * as Yup from "yup";

const SeriesBodySchema = Yup.object({
  item: SeriesSchema.optional(),
  old: SeriesSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await SeriesBodySchema.validate(rawBody, { stripUnknown: true });

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
    const body = await SeriesBodySchema.validate(rawBody, { stripUnknown: true });

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
    const body = await SeriesBodySchema.validate(rawBody, { stripUnknown: true });

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
