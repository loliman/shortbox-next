export interface ChangePayload {
  action?: string;
  option?: FieldItem;
  removedValue?: FieldItem;
  type?: string;
  role?: string;
  name?: string;
}

export interface FieldItem {
  __typename?: string;
  pattern?: boolean;
  name?: string;
  title?: string;
  volume?: string | number;
  us?: boolean;
  publisher?: { name?: string; us?: boolean; [key: string]: unknown };
  type?: string[] | string;
  role?: string[] | string;
  [key: string]: unknown;
}

export type UpdateFieldOption = string | ChangePayload | null | undefined | FieldItem[];

function cloneFieldItems(values: FieldItem[] | undefined): FieldItem[] {
  return (values || []).map((entry) => ({ ...entry }));
}

function isAppearancePayload(payload: ChangePayload): boolean {
  return (payload.name || "").includes("appearances");
}

function applyLivePatternValue(
  option: UpdateFieldOption,
  values: FieldItem[] | undefined,
  pattern: string
) {
  const nextValues = cloneFieldItems(values);
  const lastValue = nextValues.at(-1);

  if (lastValue?.pattern) {
    nextValues.splice(-1, 1, {
      ...lastValue,
      [pattern]: option,
    });
    return nextValues;
  }

  const dummy: FieldItem = { pattern: true };
  dummy[pattern] = option;
  nextValues.push(dummy);
  return nextValues;
}

function mergeSelectedOption(selected: FieldItem[], payload: ChangePayload) {
  const previous = selected.filter((value) => value.name === payload.option?.name);
  if (previous.length === 0) {
    const value = structuredClone(payload.option || {}) as FieldItem;
    if (payload.option?.__typename === "Appearance") {
      value.type = payload.type;
      value.role = payload.role;
    } else {
      value.type = payload.type ? [payload.type] : [];
      value.role = payload.role ? [payload.role] : [];
    }
    selected.push(value);
    return;
  }

  if (payload.option?.__typename === "Appearance") {
    previous[0].type = payload.type;
    previous[0].role = payload.role;
    return;
  }

  if (
    Array.isArray(previous[0].type) &&
    previous[0].type.filter((value) => value === payload.type).length === 0
  ) {
    previous[0].type.push(payload.type || "");
    if (Array.isArray(previous[0].role)) previous[0].role.push(payload.role || "");
  }
}

function removeSelectedOption(selected: FieldItem[], payload: ChangePayload) {
  if (isAppearancePayload(payload)) {
    return selected.filter(
      (value) => `${value.name}${value.type}` !== `${payload.removedValue?.name}${payload.type}`
    );
  }

  const previous = selected.filter((value) => value.name === payload.removedValue?.name);
  if (previous.length > 0 && Array.isArray(previous[0].type)) {
    previous[0].type = previous[0].type.filter((value) => value !== payload.type);
  }
  return selected;
}

function clearSelectedOption(selected: FieldItem[], payload: ChangePayload) {
  if (isAppearancePayload(payload)) {
    return selected.filter((value) => value.type !== payload.type);
  }

  selected.forEach((entry) => {
    if (Array.isArray(entry.type)) {
      entry.type = entry.type.filter((value) => value !== payload.type);
    }
  });
  return selected;
}

function createSelectedOption(selected: FieldItem[], payload: ChangePayload, values: FieldItem[] | undefined) {
  selected.push({
    name: payload.option?.name ?? values?.at(-1)?.name ?? "",
    type: payload.type ? [payload.type] : [],
    role: payload.role ? [payload.role] : [],
  });
}

function normalizeSelectedItems(selected: FieldItem[]) {
  return selected.filter((entry) => !entry.pattern && Array.isArray(entry.type) && entry.type.length > 0);
}

function applySelectionChange(
  payload: ChangePayload,
  selected: FieldItem[],
  values: FieldItem[] | undefined
) {
  switch (payload.action) {
    case "deselect-option":
    case "select-option":
      mergeSelectedOption(selected, payload);
      return selected;
    case "remove-value":
      return removeSelectedOption(selected, payload);
    case "clear":
      return clearSelectedOption(selected, payload);
    case "create-option":
      createSelectedOption(selected, payload, values);
      return selected;
    default:
      return null;
  }
}

export function updateField(
  option: UpdateFieldOption,
  live: boolean,
  values: FieldItem[] | undefined,
  setFieldValue: (field: string, value: unknown) => void,
  field: string,
  pattern: string
) {
  if (Array.isArray(option)) {
    setFieldValue(field, option.filter((entry) => Boolean(entry) && !entry.pattern));
    return;
  }

  if (typeof option === "string" && option.trim() === "") return;

  if (live) {
    setFieldValue(field, applyLivePatternValue(option, values, pattern));
    return;
  }

  const selected = cloneFieldItems(values);
  const nextSelected = applySelectionChange(option as ChangePayload, selected, values);
  if (!nextSelected) return;
  setFieldValue(field, normalizeSelectedItems(nextSelected));
}

export function getPattern(arr: FieldItem[] | null | undefined, pattern: string) {
  const lastEntry = arr?.at(-1);
  if (!lastEntry?.pattern) return null;
  return lastEntry[pattern];
}
