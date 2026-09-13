import { readStagedPreviewImport, saveStagedPreviewImport } from "../lib/server/preview-import-session";
import { createIssue } from "../lib/server/issues-write";
import { invalidateNavigationCache } from "../lib/server/revalidate";

export interface CommitBatchResult {
  success: boolean;
  committedCount: number;
  skippedCount: number;
  errors: Array<{ draftId: string; title: string; error: string }>;
}

export async function commitStagedPreviewImport(
  approvedDraftIds?: string[]
): Promise<CommitBatchResult> {
  const staged = await readStagedPreviewImport();
  if (!staged || staged.status !== "PENDING_REVIEW") {
    throw new Error("Kein ausstehender Vorschau-Import gefunden.");
  }

  const approvedSet = approvedDraftIds ? new Set(approvedDraftIds) : null;
  const toCommit = staged.drafts.filter((d) =>
    approvedSet ? approvedSet.has(d.id) : d.selected
  );

  let committedCount = 0;
  const errors: Array<{ draftId: string; title: string; error: string }> = [];

  // Sort so main issues are created before variants
  const sorted = [...toCommit].sort((a, b) => {
    if (a.isVariant === b.isVariant) return 0;
    return a.isVariant ? 1 : -1;
  });

  for (const draft of sorted) {
    try {
      const values = draft.rawDraft.values;
      const parsedPrice = values.price ? parseFloat(values.price.replace(",", ".")) : undefined;

      const itemPayload = {
        title: values.title || undefined,
        number: values.number || undefined,
        format: values.format || undefined,
        variant: values.variant || undefined,
        releasedate: values.releasedate || undefined,
        pages: values.pages ? Number(values.pages) : undefined,
        price: Number.isFinite(parsedPrice) ? parsedPrice : undefined,
        currency: values.currency || "EUR",
        limitation: values.limitation || undefined,
        addinfo: values.addinfo || undefined,
        series: {
          title: draft.series.title,
          volume: Number(draft.series.volume || 1),
          publisher: {
            name: draft.series.publisherName,
            us: false,
          },
        },
        stories: (values.stories || []).map((s: Record<string, unknown>) => ({
          title: typeof s.title === "string" ? s.title : "",
          number: typeof s.number === "number" ? s.number : 0,
          addinfo: typeof s.addinfo === "string" ? s.addinfo : "",
          part: typeof s.part === "string" ? s.part : "",
          exclusive: Boolean(s.exclusive),
          parent: s.parent as Record<string, unknown> | undefined,
        })),
      };

      const res = await createIssue(itemPayload as never);
      if (!res.success) {
        errors.push({
          draftId: draft.id,
          title: draft.sourceTitle,
          error: res.error || "Erstellung fehlgeschlagen",
        });
      } else {
        committedCount += 1;
      }
    } catch (err) {
      errors.push({
        draftId: draft.id,
        title: draft.sourceTitle,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const skippedCount = staged.drafts.length - committedCount;

  staged.status = "COMMITTED";
  staged.updatedAt = new Date().toISOString();
  await saveStagedPreviewImport(staged);

  invalidateNavigationCache();

  return {
    success: errors.length === 0,
    committedCount,
    skippedCount,
    errors,
  };
}
