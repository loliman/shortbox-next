import type React from "react";

export interface FieldItem {
  __typename?: string;
  pattern?: boolean;
  name?: string;
  title?: string;
  type?: string[] | string;
  role?: string[] | string;
  [key: string]: unknown;
}

export interface ChangePayload {
  action?: string;
  option?: FieldItem;
  removedValue?: FieldItem;
  type?: string;
  role?: string;
  name?: string;
}

export type ContainsType = "stories";

export interface ContainsProps {
  items?: FieldItem[];
  values?: unknown;
  setFieldValue?: (field: string, value: unknown, shouldValidate?: boolean) => void;
  expandedStoryIndex?: number | null;
  draggedStoryIndex?: number | null;
  dragOverStoryIndex?: number | null;
  onStoryToggle?: (index: number) => void;
  onStoryAdded?: (index: number) => void;
  onStoryDragStart?: (index: number) => void;
  onStoryDragEnd?: () => void;
  onStoryDragOver?: (index: number) => void;
  onStoryReorder?: (fromIndex: number, toIndex: number) => void;
  isDesktop?: boolean;
  us?: boolean;
  disabled?: boolean;
  type?: ContainsType;
  index?: number;
  item?: FieldItem;
  fields?: React.ReactElement;
  defaultItem?: FieldItem;
  [key: string]: unknown;
}
