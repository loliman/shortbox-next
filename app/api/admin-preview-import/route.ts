import { NextRequest, NextResponse } from "next/server";
import { requireApiAdminSession } from "@/src/lib/server/guards";
import {
  readActivePreviewImportQueue,
  clearActivePreviewImportQueue,
  readStagedPreviewImport,
  saveStagedPreviewImport,
  clearStagedPreviewImport,
} from "@/src/lib/server/preview-import-session";
import { runCheckPaniniPreviewPipeline } from "@/src/services/preview-auto-pipeline";
import { commitStagedPreviewImport } from "@/src/services/preview-batch-commit";
import { extractTextFromPdfBuffer } from "@/src/lib/server/pdf-text-extract";
import { extractPdfLayoutFromBuffer } from "@/src/lib/server/pdf-layout-extract";
import {
  readDeSeriesByTitle,
  readUsSeriesByTitle,
  findDeSeriesForBatchImport,
  checkDeIssueExists,
} from "@/src/lib/read/preview-import-read";
import { parsePreviewImportQueue } from "@/src/services/preview-import-parser";
import { buildStagedPreviewImport } from "@/src/services/preview-batch-import";
import type { IssueEditorFormValues } from "@/src/components/restricted/editor/issue-editor/types";

export async function GET() {
  const auth = await requireApiAdminSession();
  if (auth.response) return auth.response;

  const staged = await readStagedPreviewImport();
  const queue = await readActivePreviewImportQueue();

  return NextResponse.json(
    { staged, queue: queue?.queue ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdminSession();
  if (auth.response) return auth.response;

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      action?: "trigger-check" | "commit" | "discard" | "toggle-draft" | "update-draft";
      force?: boolean;
      approvedDraftIds?: string[];
      draftId?: string;
      selected?: boolean;
      values?: Partial<IssueEditorFormValues>;
    };

    if (body.action === "trigger-check") {
      try {
        const result = await runCheckPaniniPreviewPipeline({ force: body.force });
        return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Prüfung fehlgeschlagen" },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    if (body.action === "commit") {
      try {
        const result = await commitStagedPreviewImport(body.approvedDraftIds);
        return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Import fehlgeschlagen" },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    if (body.action === "discard") {
      await clearStagedPreviewImport();
      await clearActivePreviewImportQueue();
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "toggle-draft" && body.draftId) {
      const staged = await readStagedPreviewImport();
      if (!staged) {
        return NextResponse.json({ error: "Kein Import gefunden" }, { status: 404 });
      }
      const draft = staged.drafts.find((d) => d.id === body.draftId);
      if (draft) {
        draft.selected = body.selected !== undefined ? body.selected : !draft.selected;
        await saveStagedPreviewImport(staged);
      }
      return NextResponse.json({ staged }, { headers: { "Cache-Control": "no-store" } });
    }

    if (body.action === "update-draft" && body.draftId && body.values) {
      const staged = await readStagedPreviewImport();
      if (!staged) {
        return NextResponse.json({ error: "Kein Import gefunden" }, { status: 404 });
      }
      const draft = staged.drafts.find((d) => d.id === body.draftId);
      if (!draft) {
        return NextResponse.json({ error: "Draft nicht gefunden" }, { status: 404 });
      }

      const v = body.values;
      draft.rawDraft.values = {
        ...draft.rawDraft.values,
        ...v,
      };

      // Synchronize derived display fields
      const seriesTitle = (v.series?.title || draft.series.title || "").trim();
      const existingSeries = seriesTitle ? await findDeSeriesForBatchImport(seriesTitle) : null;
      const isVariant = Boolean(draft.parentDraftId || v.variant);

      let status = draft.status;
      let statusMessage = "";

      if (existingSeries) {
        const issueNum = String(v.number ?? draft.issue.number ?? "");
        const alreadyExists = await checkDeIssueExists(existingSeries.id, issueNum);
        if (alreadyExists && !isVariant) {
          status = "DUPLICATE";
          statusMessage = `Heft #${issueNum} existiert bereits in ${existingSeries.title}`;
        } else {
          status = "READY";
        }
      } else {
        status = "NEW_SERIES";
        statusMessage = "Serie existiert noch nicht in der Datenbank (wird neu angelegt)";
      }

      draft.status = status;
      draft.statusMessage = statusMessage;
      draft.series = {
        id: existingSeries?.id ?? null,
        title: existingSeries?.title ?? seriesTitle,
        volume: Number(existingSeries?.volume || v.series?.volume || draft.series.volume || 1),
        isNew: !existingSeries,
        publisherName: existingSeries?.publisherName || v.series?.publisher?.name || draft.series.publisherName,
      };

      const storiesList = Array.isArray(v.stories) ? v.stories : draft.rawDraft.values.stories || [];
      const storiesSummary = storiesList
        .slice(0, 3)
        .map((s: Record<string, unknown>) => {
          const title = typeof s.title === "string" ? s.title : "";
          const num = s.number ? `#${s.number}` : "";
          return `${title} ${num}`.trim();
        })
        .filter(Boolean)
        .join(", ");

      const parsedPrice = v.price ? parseFloat(String(v.price).replace(",", ".")) : undefined;

      draft.issue = {
        number: String(v.number ?? draft.issue.number ?? ""),
        title: String(v.title ?? draft.issue.title ?? ""),
        format: v.format ?? draft.issue.format,
        variant: v.variant ?? draft.issue.variant,
        releasedate: v.releasedate ?? draft.issue.releasedate,
        pages: v.pages != null ? Number(v.pages) : draft.issue.pages,
        price: Number.isFinite(parsedPrice) ? parsedPrice : draft.issue.price,
        currency: v.currency ?? draft.issue.currency ?? "EUR",
        limitation: v.limitation ?? draft.issue.limitation,
        addinfo: v.addinfo ?? draft.issue.addinfo,
        storiesCount: storiesList.length,
        storiesSummary: storiesSummary
          ? `${storiesSummary}${storiesList.length > 3 ? "..." : ""}`
          : undefined,
      };

      // Recalculate summary metrics
      staged.readyCount = staged.drafts.filter((d) => d.inScope && d.status === "READY").length;
      staged.newSeriesCount = staged.drafts.filter((d) => d.inScope && d.status === "NEW_SERIES").length;
      staged.duplicateCount = staged.drafts.filter((d) => d.inScope && d.status === "DUPLICATE").length;

      await saveStagedPreviewImport(staged);
      return NextResponse.json({ staged, draft }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  }

  // Fallback: File upload via FormData
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
    const buffer = await file.arrayBuffer();
    const [text, layout] = await Promise.all([
      extractTextFromPdfBuffer(buffer.slice(0)),
      extractPdfLayoutFromBuffer(buffer.slice(0)),
    ]);

    const numMatch = file.name.match(/(\d+)/);
    const previewNumber = numMatch ? parseInt(numMatch[1], 10) : 0;

    const queue = await parsePreviewImportQueue({
      fileName: file.name,
      text,
      layout,
      seriesReader: {
        findDeSeriesByTitle: readDeSeriesByTitle,
        findUsSeriesByTitle: readUsSeriesByTitle,
      },
    });

    const staged = await buildStagedPreviewImport({
      queue,
      previewNumber,
      matcher: {
        findDeSeries: findDeSeriesForBatchImport,
        issueExists: checkDeIssueExists,
      },
    });

    await saveStagedPreviewImport(staged);

    return NextResponse.json(
      { staged },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PDF konnte nicht importiert werden" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function DELETE() {
  const auth = await requireApiAdminSession();
  if (auth.response) return auth.response;

  await clearStagedPreviewImport();
  await clearActivePreviewImportQueue();

  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
