import type { PreviewImportDraft, PreviewImportQueue } from "../../types/preview-import";

export function findCurrentDraft(queue: PreviewImportQueue): { draft: PreviewImportDraft; index: number } | null {
  const index = queue.drafts.findIndex((draft) => draft.status === "pending");
  if (index < 0) return null;
  const draft = queue.drafts[index];
  return draft ? { draft, index } : null;
}

export function findPreviousSkippedDraftIndex(queue: PreviewImportQueue): number {
  const current = findCurrentDraft(queue);
  if (!current) return -1;

  for (let index = current.index - 1; index >= 0; index -= 1) {
    const draft = queue.drafts[index];
    if (draft?.status === "skipped") return index;
  }

  return -1;
}
