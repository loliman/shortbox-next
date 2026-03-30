import type { IssueEditorFormValues } from "../components/restricted/editor/issue-editor/types";

export type PreviewImportDraftStatus = "pending" | "skipped" | "created";

export interface PreviewImportDraft {
  id: string;
  sourceTitle: string;
  issueCode?: string;
  variantOfDraftId?: string | null;
  status: PreviewImportDraftStatus;
  warnings: string[];
  values: IssueEditorFormValues;
  createdIssueId?: string;
}

export interface PreviewImportQueue {
  id: string;
  fileName: string;
  createdAt: string;
  updatedAt: string;
  drafts: PreviewImportDraft[];
}

export interface ActivePreviewImportQueue {
  queue: PreviewImportQueue;
  currentDraft: PreviewImportDraft;
  currentDraftIndex: number;
  totalDraftCount: number;
  canGoBack: boolean;
}
