import type { IssueEditorFormValues } from "../components/restricted/editor/issue-editor/types";
import type { MarvelScopeCategory } from "../services/preview-marvel-filter";

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

export type StagedDraftStatus = "READY" | "NEW_SERIES" | "DUPLICATE" | "CONFLICT";

export interface StagedPreviewDraft {
  id: string;
  sourceTitle: string;
  issueCode?: string;
  category: MarvelScopeCategory;
  inScope: boolean;
  selected: boolean;
  status: StagedDraftStatus;
  statusMessage?: string;
  isVariant: boolean;
  parentDraftId?: string | null;
  series: {
    id?: string | number | null;
    title: string;
    volume: number;
    isNew: boolean;
    publisherName: string;
  };
  issue: {
    number: string;
    title: string;
    format?: string;
    variant?: string;
    releasedate?: string;
    pages?: number;
    price?: number;
    currency?: string;
    limitation?: string;
    addinfo?: string;
    storiesCount: number;
    storiesSummary?: string;
  };
  rawDraft: PreviewImportDraft;
}

export interface StagedPreviewImport {
  id: string;
  previewNumber: number;
  title: string;
  sourceUrl?: string;
  fileName: string;
  status: "PENDING_REVIEW" | "COMMITTED" | "DISCARDED";
  createdAt: string;
  updatedAt: string;
  totalDrafts: number;
  inScopeDrafts: number;
  readyCount: number;
  newSeriesCount: number;
  duplicateCount: number;
  drafts: StagedPreviewDraft[];
}
