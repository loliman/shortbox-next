import { NextRequest, NextResponse } from "next/server";
import { requireApiAdminSession } from "@/src/lib/server/guards";
import { readActivePreviewImportQueue, replaceActivePreviewImportQueue, clearActivePreviewImportQueue, advanceActivePreviewImportQueue, rewindActivePreviewImportQueue } from "@/src/lib/server/preview-import-session";
import { extractTextFromPdfBuffer } from "@/src/lib/server/pdf-text-extract";
import { readDeSeriesByTitle } from "@/src/lib/read/preview-import-read";
import { parsePreviewImportQueue } from "@/src/services/preview-import-parser";

export async function POST(request: NextRequest) {
  const auth = await requireApiAdminSession();
  if (auth.response) return auth.response;

  const existingQueue = await readActivePreviewImportQueue();
  if (existingQueue) {
    return NextResponse.json(
      { error: "Es existiert bereits eine aktive Import-Queue" },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Bitte eine PDF-Datei hochladen" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Es werden nur PDF-Dateien unterstützt" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const text = await extractTextFromPdfBuffer(await file.arrayBuffer());
    const queue = await parsePreviewImportQueue({
      fileName: file.name,
      text,
      seriesReader: {
        findDeSeriesByTitle: readDeSeriesByTitle,
      },
    });
    await replaceActivePreviewImportQueue(queue);

    return NextResponse.json(
      { queue },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF konnte nicht importiert werden" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAdminSession();
  if (auth.response) return auth.response;

  const body = (await request.json()) as {
    action?: "skip" | "complete" | "back";
    draftId?: string;
    createdIssueId?: string;
  };

  if (body.action === "back") {
    try {
      const nextQueue = await rewindActivePreviewImportQueue();

      return NextResponse.json(
        { queue: nextQueue?.queue || null },
        { headers: { "Cache-Control": "no-store" } }
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Queue konnte nicht aktualisiert werden" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
  }

  const draftId = String(body.draftId || "").trim();
  if (!draftId) {
    return NextResponse.json(
      { error: "draftId wird benötigt" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (body.action !== "skip" && body.action !== "complete") {
    return NextResponse.json(
      { error: "Ungültige Queue-Aktion" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const nextQueue = await advanceActivePreviewImportQueue(
      body.action === "skip" ? "skipped" : "created",
      draftId,
      body.createdIssueId
    );

    return NextResponse.json(
      { queue: nextQueue?.queue || null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Queue konnte nicht aktualisiert werden" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE() {
  const auth = await requireApiAdminSession();
  if (auth.response) return auth.response;

  await clearActivePreviewImportQueue();

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
