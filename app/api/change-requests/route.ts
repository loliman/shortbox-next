import { NextRequest, NextResponse } from "next/server";
import { requireApiAdminSession } from "@/src/lib/server/guards";
import {
  invalidateChangeRequestsCache,
  invalidateNavigationCache,
} from "@/src/lib/server/revalidate";
import {
  acceptChangeRequestById,
  createIssueChangeRequest,
  discardChangeRequestById,
} from "@/src/lib/server/change-requests-write";
import * as Yup from "yup";

const ChangeRequestBodySchema = Yup.object({
  issue: Yup.object().optional(),
  item: Yup.object().optional(),
});

type ChangeRequestBody = {
  issue?: Record<string, unknown>;
  item?: Record<string, unknown>;
};

const ChangeRequestIdSchema = Yup.object({
  id: Yup.mixed().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const body = await ChangeRequestBodySchema.validate(rawBody, { stripUnknown: true }) as ChangeRequestBody;

    const result = await createIssueChangeRequest({
      issue: body.issue,
      item: body.item,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    invalidateChangeRequestsCache();
    return NextResponse.json({ item: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Change Request konnte nicht erstellt werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiAdminSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await ChangeRequestIdSchema.validate(rawBody, { stripUnknown: true });

    const result = await discardChangeRequestById(body.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    invalidateChangeRequestsCache();
    return NextResponse.json({ success: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Change Request konnte nicht verworfen werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireApiAdminSession();
    if (auth.response) return auth.response;

    const rawBody = await request.json();
    const body = await ChangeRequestIdSchema.validate(rawBody, { stripUnknown: true });

    const result = await acceptChangeRequestById(body.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    invalidateChangeRequestsCache();
    invalidateNavigationCache();
    return NextResponse.json({ item: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Yup.ValidationError ? error.errors.join(", ") : "Change Request konnte nicht akzeptiert werden";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
