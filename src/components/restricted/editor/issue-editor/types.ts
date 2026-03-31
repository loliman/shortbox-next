import type { SelectedRoot } from "../../../../types/domain";
import type { MouseEvent, ReactNode } from "react";
import type { SessionData } from "../../../../app/session";

export interface IssueEditorFormValues {
  title: string;
  series: {
    title: string;
    volume: number | string;
    publisher: {
      name: string;
      us: boolean;
    };
  };
  number: string;
  variant: string;
  cover: { __typename?: string; url?: string } | string | null | undefined;
  format?: string;
  limitation?: string;
  pages?: number;
  releasedate: string;
  price?: string;
  currency?: string;
  individuals: Array<Record<string, unknown>>;
  addinfo: string;
  comicguideid?: number;
  isbn?: string;
  arcs?: Array<Record<string, unknown>>;
  stories: Array<Record<string, unknown>>;
  copyBatch: {
    enabled: boolean;
    count: number | string;
    prefix: string;
  };
}

export interface IssueEditorProps {
  defaultValues?: IssueEditorFormValues;
  edit?: boolean;
  copy?: boolean;
  id?: string | number;
  session?: SessionData | null;
  isDesktop?: boolean;
  enqueueSnackbar: (
    message: string,
    options?: { variant?: "success" | "error" | "warning" | "info" }
  ) => void;
  selected?: SelectedRoot;
  lockedFields?: {
    title?: boolean;
    publisher?: boolean;
    series?: boolean;
    number?: boolean;
    format?: boolean;
    variant?: boolean;
    stories?: boolean;
  };
  [key: string]: unknown;
}

export interface IssueEditorState {
  defaultValues: IssueEditorFormValues;
  header: string;
  submitLabel: string;
  submitAndCopyLabel: string;
  successMessage: string;
  errorMessage: string;
  copy: boolean;
}

export interface IssueEditorFormContentProps {
  values: IssueEditorFormValues;
  edit?: boolean;
  copy?: boolean;
  isDesktop?: boolean;
  id?: string | number;
  session?: SessionData | null;
  header: string;
  submitLabel: string;
  submitAndCopyLabel: string;
  isSubmitting: boolean;
  setFieldValue: (field: string, value: unknown, shouldValidate?: boolean) => void;
  resetForm: () => void;
  onToggleUs: () => void;
  onCancel: (event: MouseEvent<HTMLButtonElement>) => void;
  onSubmitMode: (copyMode: boolean) => void;
  notice?: ReactNode;
  actions?: ReactNode;
  showHints?: boolean;
  lockedFields?: {
    title?: boolean;
    publisher?: boolean;
    series?: boolean;
    number?: boolean;
    format?: boolean;
    variant?: boolean;
    stories?: boolean;
  };
}
