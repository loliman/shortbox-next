import { NextRequest, NextResponse } from "next/server";
import { requireApiWriteSession } from "@/src/lib/server/guards";
import { createPublisher, deletePublisherByLookup, editPublisher } from "@/src/lib/server/publishers-write";
import { invalidateNavigationCache } from "@/src/lib/server/revalidate";
import { PublisherSchema } from "@/src/util/yupSchema";
import * as Yup from "yup";

const PublisherBodySchema = Yup.object({
  item: PublisherSchema.optional(),
  old: PublisherSchema.optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await PublisherBodySchema.validate(rawBody, { stripUnknown: true });
    
    const result = await createPublisher(body.item || {});
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }
    
    invalidateNavigationCache();
    return NextResponse.json({ item: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Publisher konnte nicht erstellt werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await PublisherBodySchema.validate(rawBody, { stripUnknown: true });
    
    const result = await editPublisher(body.old || {}, body.item || {});
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }
    
    invalidateNavigationCache();
    return NextResponse.json({ item: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Publisher konnte nicht gespeichert werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiWriteSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await PublisherBodySchema.validate(rawBody, { stripUnknown: true });
    
    const result = await deletePublisherByLookup(body.item || {});
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }
    
    invalidateNavigationCache();
    return NextResponse.json({ success: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Publisher konnte nicht gelöscht werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
